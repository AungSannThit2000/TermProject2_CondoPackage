import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, signToken } from "@/lib/auth";
import { buildDateRange, endOfDay, endOfMonth, startOfDay, startOfMonth } from "@/lib/date";
import { nextSequence } from "@/lib/sequence";

import User from "@/models/User";
import Building from "@/models/Building";
import Room from "@/models/Room";
import Tenant from "@/models/Tenant";
import Staff from "@/models/Staff";
import Package from "@/models/Package";
import PackageStatusLog from "@/models/PackageStatusLog";

const PACKAGE_STATUS_ALLOWED = ["ARRIVED", "PICKED_UP", "RETURNED"];
const CORS_ALLOW_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const CORS_ALLOW_HEADERS = "Content-Type, Authorization";

function getCorsOrigin() {
  return process.env.CORS_ORIGIN || "*";
}

function withCors(response) {
  const origin = getCorsOrigin();
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
  response.headers.set("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
  if (origin !== "*") {
    response.headers.set("Vary", "Origin");
  }
  return response;
}

function json(message, status = 200) {
  return withCors(NextResponse.json(message, { status }));
}

function empty(status = 204) {
  return withCors(new NextResponse(null, { status }));
}

function decodePart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseIntStrict(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapBy(items, keyName) {
  const map = new Map();
  for (const item of items) {
    map.set(item[keyName], item);
  }
  return map;
}

function mapByComposite(items, keyBuilder) {
  const map = new Map();
  for (const item of items) {
    map.set(keyBuilder(item), item);
  }
  return map;
}

function sortByBuildingRoom(a, b) {
  const bc = String(a.building_code || "").localeCompare(String(b.building_code || ""));
  if (bc !== 0) return bc;
  return String(a.room_no || "").localeCompare(String(b.room_no || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function isDuplicateKeyError(err) {
  return err && err.code === 11000;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getTenantContextByUserId(userId) {
  const tenant = await Tenant.findOne({ user_id: userId }).lean();
  if (!tenant) return null;

  const [room, building] = await Promise.all([
    Room.findOne({ building_id: tenant.building_id, room_no: tenant.room_no }).lean(),
    Building.findOne({ building_id: tenant.building_id }).lean(),
  ]);

  return {
    tenant_id: tenant.tenant_id,
    full_name: tenant.full_name,
    phone: tenant.phone,
    email: tenant.email,
    room_no: tenant.room_no,
    floor: room?.floor ?? null,
    building_code: building?.building_code ?? "",
  };
}

async function getDisplayNameByUser(user) {
  if (user.role === "TENANT") {
    const tenant = await Tenant.findOne({ user_id: user.user_id }).lean();
    return tenant?.full_name || user.username;
  }

  const staff = await Staff.findOne({ user_id: user.user_id }).lean();
  return staff?.full_name || user.username;
}

async function hydratePackages(packages, { includeHandledBy = false } = {}) {
  if (!packages.length) return [];

  const tenantIds = [...new Set(packages.map((p) => p.tenant_id).filter(Boolean))];
  const tenants = await Tenant.find({ tenant_id: { $in: tenantIds } }).lean();
  const tenantMap = mapBy(tenants, "tenant_id");

  const buildingIds = [...new Set(tenants.map((t) => t.building_id))];
  const buildings = await Building.find({ building_id: { $in: buildingIds } }).lean();
  const buildingMap = mapBy(buildings, "building_id");

  let staffMap = new Map();
  if (includeHandledBy) {
    const staffIds = [...new Set(packages.map((p) => p.received_by_staff_id).filter(Boolean))];
    if (staffIds.length) {
      const staff = await Staff.find({ staff_id: { $in: staffIds } }).lean();
      staffMap = mapBy(staff, "staff_id");
    }
  }

  return packages.map((pkg) => {
    const tenant = tenantMap.get(pkg.tenant_id);
    const building = tenant ? buildingMap.get(tenant.building_id) : null;
    const staff = includeHandledBy ? staffMap.get(pkg.received_by_staff_id) : null;

    return {
      package_id: pkg.package_id,
      tracking_no: pkg.tracking_no,
      carrier: pkg.carrier,
      current_status: pkg.current_status,
      arrived_at: pkg.arrived_at,
      picked_up_at: pkg.picked_up_at,
      tenant_name: tenant?.full_name || null,
      building_code: building?.building_code || null,
      room_no: tenant?.room_no || null,
      handled_by_staff: staff?.full_name || null,
    };
  });
}

async function hydrateLogs(logs) {
  if (!logs.length) return [];

  const packageIds = [...new Set(logs.map((l) => l.package_id))];
  const packages = await Package.find({ package_id: { $in: packageIds } }).lean();
  const packageMap = mapBy(packages, "package_id");

  const tenantIds = [...new Set(packages.map((p) => p.tenant_id))];
  const tenants = await Tenant.find({ tenant_id: { $in: tenantIds } }).lean();
  const tenantMap = mapBy(tenants, "tenant_id");

  const buildingIds = [...new Set(tenants.map((t) => t.building_id))];
  const buildings = await Building.find({ building_id: { $in: buildingIds } }).lean();
  const buildingMap = mapBy(buildings, "building_id");

  const staffIds = [...new Set(logs.map((l) => l.updated_by_staff_id).filter(Boolean))];
  const staff = staffIds.length ? await Staff.find({ staff_id: { $in: staffIds } }).lean() : [];
  const staffMap = mapBy(staff, "staff_id");

  return logs.map((log) => {
    const pkg = packageMap.get(log.package_id);
    const tenant = pkg ? tenantMap.get(pkg.tenant_id) : null;
    const building = tenant ? buildingMap.get(tenant.building_id) : null;
    const updater = staffMap.get(log.updated_by_staff_id);

    return {
      package_id: log.package_id,
      status: log.status,
      status_time: log.status_time,
      note: log.note || "",
      tracking_no: pkg?.tracking_no || null,
      carrier: pkg?.carrier || null,
      tenant_name: tenant?.full_name || null,
      building_code: building?.building_code || null,
      room_no: tenant?.room_no || null,
      updated_by: updater?.full_name || "Unknown",
    };
  });
}

async function deleteTenantCascade(tenantId) {
  const tenant = await Tenant.findOne({ tenant_id: tenantId }).lean();
  if (!tenant) return false;

  const tenantPackages = await Package.find({ tenant_id: tenantId }, { package_id: 1 }).lean();
  const packageIds = tenantPackages.map((p) => p.package_id);

  if (packageIds.length) {
    await PackageStatusLog.deleteMany({ package_id: { $in: packageIds } });
    await Package.deleteMany({ package_id: { $in: packageIds } });
  }

  await Tenant.deleteOne({ tenant_id: tenantId });
  await User.deleteOne({ user_id: tenant.user_id });

  return true;
}

async function deleteStaffCascade(staffId) {
  const staff = await Staff.findOne({ staff_id: staffId }).lean();
  if (!staff) return false;

  await PackageStatusLog.deleteMany({ updated_by_staff_id: staffId });

  const receivedPackages = await Package.find(
    { received_by_staff_id: staffId },
    { package_id: 1 }
  ).lean();
  const packageIds = receivedPackages.map((p) => p.package_id);

  if (packageIds.length) {
    await PackageStatusLog.deleteMany({ package_id: { $in: packageIds } });
    await Package.deleteMany({ package_id: { $in: packageIds } });
  }

  await Staff.deleteOne({ staff_id: staffId });
  await User.deleteOne({ user_id: staff.user_id });

  return true;
}

async function getStaffIdForActor(payload) {
  const staff = await Staff.findOne({ user_id: payload.userId }).lean();
  return staff?.staff_id || null;
}

async function handleAuth(method, parts, request) {
  if (parts.length === 2 && parts[1] === "login" && method === "POST") {
    const body = await readBody(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return json({ error: "Username and password are required" }, 400);
    }

    const user = await User.findOne({ username }).lean();
    if (!user) {
      return json({ error: "Invalid username or password" }, 401);
    }

    if (user.status !== "ACTIVE") {
      return json({ error: "Account is not active" }, 403);
    }

    const stored = user.password_hash || "";
    const looksHashed = stored.startsWith("$2");
    const isValidPassword = looksHashed ? await bcrypt.compare(password, stored) : stored === password;

    if (!isValidPassword) {
      return json({ error: "Invalid username or password" }, 401);
    }

    const displayName = await getDisplayNameByUser(user);
    const token = signToken({ userId: user.user_id, role: user.role });

    return json({ token, role: user.role, displayName });
  }

  return json({ message: "Not found" }, 404);
}

async function handleOfficer(method, parts, request) {
  const auth = requireAuth(request, ["OFFICER", "ADMIN"]);
  if (!auth.ok) return json({ message: auth.message }, auth.status);

  const { payload } = auth;

  if (parts.length === 2 && parts[1] === "me" && method === "GET") {
    const staff = await Staff.findOne({ user_id: payload.userId }).lean();
    if (!staff) {
      return json({ message: "Profile not found" }, 404);
    }

    return json({ staff_id: staff.staff_id, full_name: staff.full_name, role: payload.role });
  }

  if (parts.length === 2 && parts[1] === "dashboard" && method === "GET") {
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const unit = params.get("unit");

    const range = buildDateRange({
      period: params.get("period"),
      start_date: params.get("start_date"),
      end_date: params.get("end_date"),
      date: params.get("date"),
      defaultToday: true,
    });

    const filters = {};
    if (range) filters.arrived_at = range;
    if (status) filters.current_status = status;

    const [atCondo, pickedUpToday, returnedThisMonth, rawPackages, rooms, buildings, tenants] =
      await Promise.all([
        Package.countDocuments({ current_status: "ARRIVED" }),
        Package.countDocuments({
          current_status: "PICKED_UP",
          picked_up_at: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
        }),
        Package.countDocuments({
          current_status: "RETURNED",
          arrived_at: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) },
        }),
        Package.find(filters).sort({ arrived_at: -1 }).limit(200).lean(),
        Room.find({}).sort({ room_no: 1 }).lean(),
        Building.find({}).sort({ building_code: 1 }).lean(),
        Tenant.find({}).lean(),
      ]);

    const tenantMap = mapBy(tenants, "tenant_id");
    const buildingMap = mapBy(buildings, "building_id");

    let todayPackages = rawPackages.map((pkg) => {
      const tenant = tenantMap.get(pkg.tenant_id);
      const building = tenant ? buildingMap.get(tenant.building_id) : null;
      return {
        package_id: pkg.package_id,
        tracking_no: pkg.tracking_no,
        tenant_name: tenant?.full_name || null,
        building_code: building?.building_code || null,
        room_no: tenant?.room_no || null,
        current_status: pkg.current_status,
        arrived_at: pkg.arrived_at,
      };
    });

    if (unit) {
      todayPackages = todayPackages.filter(
        (row) => `${row.building_code || ""}${row.room_no || ""}` === unit
      );
    }

    todayPackages = todayPackages.slice(0, 50);

    const buildingMapForUnits = mapBy(buildings, "building_id");
    const unitOptions = rooms
      .map((room) => {
        const b = buildingMapForUnits.get(room.building_id);
        return `${b?.building_code || ""}${room.room_no}`;
      })
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    return json({
      cards: {
        packagesAtCondo: atCondo,
        pickedUpToday: pickedUpToday,
        returnedThisMonth: returnedThisMonth,
      },
      todayPackages,
      unitOptions,
    });
  }

  if (parts.length === 2 && parts[1] === "package-form" && method === "GET") {
    const [buildings, rooms, tenants] = await Promise.all([
      Building.find({}).sort({ building_code: 1 }).lean(),
      Room.find({}).sort({ room_no: 1 }).lean(),
      Tenant.find({}).lean(),
    ]);

    const buildingMap = mapBy(buildings, "building_id");
    const tenantByRoom = mapByComposite(tenants, (t) => `${t.building_id}:${t.room_no}`);

    const roomRows = [];
    for (const room of rooms) {
      const tenant = tenantByRoom.get(`${room.building_id}:${room.room_no}`);
      if (!tenant) continue;
      const building = buildingMap.get(room.building_id);

      roomRows.push({
        room_no: room.room_no,
        building_id: room.building_id,
        building_code: building?.building_code || "",
        building_name: building?.building_name || null,
        tenant_id: tenant.tenant_id,
        tenant_name: tenant.full_name,
      });
    }

    return json({
      buildings: buildings.map((b) => ({
        building_id: b.building_id,
        building_code: b.building_code,
        building_name: b.building_name,
      })),
      rooms: roomRows,
    });
  }

  if (parts.length === 2 && parts[1] === "packages" && method === "POST") {
    const body = await readBody(request);

    const tenantId = parseIntStrict(body.tenant_id);
    if (!tenantId) {
      return json({ message: "tenant_id is required" }, 400);
    }

    const effectiveStatus = body.status || "ARRIVED";
    if (!PACKAGE_STATUS_ALLOWED.includes(effectiveStatus)) {
      return json({ message: "Invalid status" }, 400);
    }

    const tenant = await Tenant.findOne({ tenant_id: tenantId }).lean();
    if (!tenant) {
      return json({ message: "Tenant not found" }, 400);
    }

    const packageId = await nextSequence("package_id");
    const staffId = await getStaffIdForActor(payload);

    await Package.create({
      package_id: packageId,
      tenant_id: tenantId,
      received_by_staff_id: staffId,
      tracking_no: body.tracking_no || null,
      carrier: body.carrier || null,
      arrived_at: body.arrived_at ? new Date(body.arrived_at) : new Date(),
      current_status: effectiveStatus,
      picked_up_at: effectiveStatus === "PICKED_UP" ? new Date() : null,
    });

    await PackageStatusLog.create({
      package_id: packageId,
      updated_by_staff_id: staffId,
      status: effectiveStatus,
      note: body.note || "",
      status_time: new Date(),
    });

    return json({ message: "Created", package_id: packageId }, 201);
  }

  if (parts.length === 3 && parts[1] === "packages" && method === "GET") {
    const packageId = parseIntStrict(parts[2]);
    if (!packageId) return json({ message: "Invalid package id" }, 400);

    const pkg = await Package.findOne({ package_id: packageId }).lean();
    if (!pkg) return json({ message: "Package not found" }, 404);

    const [tenant, building, staff, latestLog] = await Promise.all([
      Tenant.findOne({ tenant_id: pkg.tenant_id }).lean(),
      (async () => {
        const t = await Tenant.findOne({ tenant_id: pkg.tenant_id }).lean();
        if (!t) return null;
        return Building.findOne({ building_id: t.building_id }).lean();
      })(),
      pkg.received_by_staff_id
        ? Staff.findOne({ staff_id: pkg.received_by_staff_id }).lean()
        : Promise.resolve(null),
      PackageStatusLog.findOne({ package_id: packageId }).sort({ status_time: -1 }).lean(),
    ]);

    return json({
      package: {
        package_id: pkg.package_id,
        tracking_no: pkg.tracking_no,
        carrier: pkg.carrier,
        tenant_name: tenant?.full_name || null,
        unit_room: `${building?.building_code || ""}${tenant?.room_no || ""}`,
        current_status: pkg.current_status,
        arrived_at: pkg.arrived_at,
        picked_up_at: pkg.picked_up_at,
        handled_by_staff: staff?.full_name || null,
      },
      latestNote: latestLog?.note || "",
    });
  }

  if (parts.length === 2 && parts[1] === "package-log" && method === "GET") {
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const unit = params.get("unit");
    const date = params.get("date");

    const filters = {};
    if (status) filters.status = status;
    if (date) {
      filters.status_time = { $gte: startOfDay(new Date(date)), $lte: endOfDay(new Date(date)) };
    }

    const logs = await PackageStatusLog.find(filters).sort({ status_time: -1 }).limit(400).lean();
    let rows = await hydrateLogs(logs);

    if (unit) {
      rows = rows.filter((row) => `${row.building_code || ""}${row.room_no || ""}` === unit);
    }

    rows = rows.slice(0, 200);

    return json({ logs: rows });
  }

  if (parts.length === 3 && parts[1] === "packages" && method === "PATCH") {
    const packageId = parseIntStrict(parts[2]);
    if (!packageId) return json({ message: "Invalid package id" }, 400);

    const body = await readBody(request);
    const status = body.status;

    if (!PACKAGE_STATUS_ALLOWED.includes(status)) {
      return json({ message: "Invalid status" }, 400);
    }

    const pkg = await Package.findOne({ package_id: packageId });
    if (!pkg) {
      return json({ message: "Package not found" }, 404);
    }

    if (status === "PICKED_UP") {
      pkg.picked_up_at = new Date();
    } else if (status === "ARRIVED") {
      pkg.picked_up_at = null;
    }

    pkg.current_status = status;
    await pkg.save();

    const staffId = await getStaffIdForActor(payload);

    await PackageStatusLog.create({
      package_id: packageId,
      updated_by_staff_id: staffId,
      status,
      note: body.note || "",
      status_time: new Date(),
    });

    return json({
      message: "Updated",
      package: {
        package_id: pkg.package_id,
        current_status: pkg.current_status,
        picked_up_at: pkg.picked_up_at,
      },
    });
  }

  return json({ message: "Not found" }, 404);
}

async function handleTenant(method, parts, request) {
  const auth = requireAuth(request, ["TENANT"]);
  if (!auth.ok) return json({ message: auth.message }, auth.status);

  const ctx = await getTenantContextByUserId(auth.payload.userId);
  if (!ctx) {
    return json({ message: "Tenant profile not found" }, 404);
  }

  if (parts.length === 2 && parts[1] === "dashboard" && method === "GET") {
    const [waiting, pickedUpThisMonth, returned, latestWaiting] = await Promise.all([
      Package.countDocuments({ tenant_id: ctx.tenant_id, current_status: "ARRIVED" }),
      Package.countDocuments({
        tenant_id: ctx.tenant_id,
        current_status: "PICKED_UP",
        picked_up_at: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) },
      }),
      Package.countDocuments({ tenant_id: ctx.tenant_id, current_status: "RETURNED" }),
      Package.find({ tenant_id: ctx.tenant_id, current_status: "ARRIVED" })
        .sort({ arrived_at: -1 })
        .limit(5)
        .lean(),
    ]);

    return json({
      cards: {
        waiting,
        pickedUpThisMonth,
        returned,
      },
      latestWaiting: latestWaiting.map((p) => ({
        tracking_no: p.tracking_no,
        carrier: p.carrier,
        current_status: p.current_status,
        arrived_at: p.arrived_at,
      })),
      profile: ctx,
    });
  }

  if (parts.length === 2 && parts[1] === "packages" && method === "GET") {
    const params = request.nextUrl.searchParams;
    const filters = { tenant_id: ctx.tenant_id };

    const range = buildDateRange({
      period: params.get("period"),
      start_date: params.get("start_date"),
      end_date: params.get("end_date"),
      date: null,
      defaultToday: false,
    });
    if (range) filters.arrived_at = range;

    const status = params.get("status");
    if (status) filters.current_status = status;

    const search = params.get("search");
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filters.$or = [
        { tracking_no: regex },
        { carrier: regex },
        { sender_name: regex },
        { current_status: regex },
      ];
    }

    const packages = await Package.find(filters).sort({ arrived_at: -1 }).limit(200).lean();

    return json({
      packages: packages.map((p) => ({
        package_id: p.package_id,
        tracking_no: p.tracking_no,
        carrier: p.carrier,
        sender_name: p.sender_name,
        current_status: p.current_status,
        arrived_at: p.arrived_at,
        picked_up_at: p.picked_up_at,
      })),
      profile: ctx,
    });
  }

  if (parts.length === 4 && parts[1] === "packages" && parts[3] === "logs" && method === "GET") {
    const packageId = parseIntStrict(parts[2]);
    if (!packageId) return json({ message: "Invalid package id" }, 400);

    const pkg = await Package.findOne({ package_id: packageId }).lean();
    if (!pkg) {
      return json({ message: "Package not found" }, 404);
    }

    if (pkg.tenant_id !== ctx.tenant_id) {
      return json({ message: "Forbidden" }, 403);
    }

    const logs = await PackageStatusLog.find({ package_id: packageId })
      .sort({ status_time: -1 })
      .lean();

    const staffIds = [...new Set(logs.map((l) => l.updated_by_staff_id).filter(Boolean))];
    const staff = staffIds.length ? await Staff.find({ staff_id: { $in: staffIds } }).lean() : [];
    const staffMap = mapBy(staff, "staff_id");

    return json({
      package: {
        package_id: pkg.package_id,
        tenant_id: pkg.tenant_id,
        tracking_no: pkg.tracking_no,
      },
      logs: logs.map((l) => ({
        status_time: l.status_time,
        status: l.status,
        note: l.note,
        updated_by: staffMap.get(l.updated_by_staff_id)?.full_name || "Unknown",
      })),
    });
  }

  if (parts.length === 2 && parts[1] === "profile" && method === "GET") {
    return json({ profile: ctx });
  }

  if (parts.length === 2 && parts[1] === "profile" && method === "PUT") {
    const body = await readBody(request);
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(body, "phone")) {
      const trimmed = String(body.phone || "").trim();
      if (trimmed.length === 0 || trimmed.length > 32) {
        return json({ message: "Phone must be 1-32 characters" }, 400);
      }
      updates.phone = trimmed;
    }

    if (Object.prototype.hasOwnProperty.call(body, "email")) {
      const trimmed = String(body.email || "").trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return json({ message: "Invalid email format" }, 400);
      }
      updates.email = trimmed;
    }

    if (Object.keys(updates).length === 0) {
      return json({ message: "Nothing to update" }, 400);
    }

    await Tenant.updateOne({ tenant_id: ctx.tenant_id }, { $set: updates });

    return json({
      profile: {
        ...ctx,
        ...updates,
      },
    });
  }

  return json({ message: "Not found" }, 404);
}

async function handleAdmin(method, parts, request) {
  const auth = requireAuth(request, ["ADMIN"]);
  if (!auth.ok) return json({ message: auth.message }, auth.status);

  if (parts.length === 2 && parts[1] === "summary" && method === "GET") {
    const [
      packagesAtCondo,
      pickedUpToday,
      returnedThisMonth,
      totalUnits,
      officers,
      tenants,
      users,
    ] = await Promise.all([
      Package.countDocuments({ current_status: "ARRIVED" }),
      Package.countDocuments({
        current_status: "PICKED_UP",
        picked_up_at: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
      }),
      Package.countDocuments({
        current_status: "RETURNED",
        arrived_at: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) },
      }),
      Room.countDocuments({}),
      User.find({ role: "OFFICER" }).lean(),
      Tenant.find({}).lean(),
      User.find({}).lean(),
    ]);

    const userMap = mapBy(users, "user_id");
    const activeTenants = tenants.filter((t) => userMap.get(t.user_id)?.status === "ACTIVE").length;

    const totalOfficers = officers.length;
    const activeOfficers = officers.filter((o) => o.status === "ACTIVE").length;

    return json({
      cards: {
        activeOfficers,
        totalUnits,
        tenantsRegistered: activeTenants,
      },
      quickStats: {
        total: totalOfficers,
        active: activeOfficers,
        inactive: totalOfficers - activeOfficers,
      },
      packageStats: {
        packagesAtCondo,
        pickedUpToday,
        returnedThisMonth,
      },
      systemStatus: "Online",
    });
  }

  if (parts.length === 2 && parts[1] === "buildings" && method === "GET") {
    const [buildings, rooms] = await Promise.all([
      Building.find({}).sort({ building_code: 1 }).lean(),
      Room.find({}).lean(),
    ]);

    const countByBuilding = new Map();
    for (const room of rooms) {
      countByBuilding.set(room.building_id, (countByBuilding.get(room.building_id) || 0) + 1);
    }

    return json({
      buildings: buildings.map((b) => ({
        building_id: b.building_id,
        building_code: b.building_code,
        building_name: b.building_name,
        room_count: countByBuilding.get(b.building_id) || 0,
      })),
    });
  }

  if (parts.length === 2 && parts[1] === "buildings" && method === "POST") {
    const body = await readBody(request);
    const buildingCode = String(body.building_code || "").trim();

    if (!buildingCode) {
      return json({ message: "building_code is required" }, 400);
    }

    try {
      const building = await Building.create({
        building_id: await nextSequence("building_id"),
        building_code: buildingCode,
        building_name: body.building_name || null,
      });

      return json(
        {
          building: {
            building_id: building.building_id,
            building_code: building.building_code,
            building_name: building.building_name,
          },
        },
        201
      );
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return json({ message: "Building code already exists" }, 409);
      }
      throw err;
    }
  }

  if (parts.length === 3 && parts[1] === "buildings" && method === "PUT") {
    const buildingId = parseIntStrict(parts[2]);
    if (!buildingId) return json({ message: "Invalid building id" }, 400);

    const body = await readBody(request);
    const updates = {
      building_code: String(body.building_code || "").trim(),
      building_name: body.building_name || null,
    };

    if (!updates.building_code) {
      return json({ message: "building_code is required" }, 400);
    }

    try {
      const building = await Building.findOneAndUpdate({ building_id: buildingId }, { $set: updates }, { new: true }).lean();
      if (!building) return json({ message: "Not found" }, 404);

      return json({
        building: {
          building_id: building.building_id,
          building_code: building.building_code,
          building_name: building.building_name,
        },
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return json({ message: "Building code already exists" }, 409);
      }
      throw err;
    }
  }

  if (parts.length === 3 && parts[1] === "buildings" && method === "DELETE") {
    const buildingId = parseIntStrict(parts[2]);
    if (!buildingId) return json({ message: "Invalid building id" }, 400);

    const tenantIds = (await Tenant.find({ building_id: buildingId }, { tenant_id: 1 }).lean()).map((t) => t.tenant_id);

    for (const tenantId of tenantIds) {
      await deleteTenantCascade(tenantId);
    }

    await Room.deleteMany({ building_id: buildingId });
    const deleted = await Building.findOneAndDelete({ building_id: buildingId }).lean();
    if (!deleted) return json({ message: "Not found" }, 404);

    return json({ message: "Deleted" });
  }

  if (parts.length === 2 && parts[1] === "rooms" && method === "GET") {
    const [rooms, buildings] = await Promise.all([
      Room.find({}).lean(),
      Building.find({}).lean(),
    ]);

    const buildingMap = mapBy(buildings, "building_id");

    const rows = rooms
      .map((room) => {
        const building = buildingMap.get(room.building_id);
        return {
          room_no: room.room_no,
          floor: room.floor,
          status: room.status,
          building_id: room.building_id,
          building_code: building?.building_code || "",
          building_name: building?.building_name || null,
        };
      })
      .sort(sortByBuildingRoom);

    return json({ rooms: rows });
  }

  if (parts.length === 2 && parts[1] === "rooms" && method === "POST") {
    const body = await readBody(request);
    const buildingId = parseIntStrict(body.building_id);
    const roomNo = String(body.room_no || "").trim();

    if (!buildingId || !roomNo) {
      return json({ message: "building_id and room_no are required" }, 400);
    }

    const buildingExists = await Building.exists({ building_id: buildingId });
    if (!buildingExists) {
      return json({ message: "Building not found for building_id" }, 400);
    }

    try {
      const room = await Room.create({
        building_id: buildingId,
        room_no: roomNo,
        floor: body.floor !== undefined && body.floor !== "" ? Number(body.floor) : null,
        status: body.status || "ACTIVE",
      });

      return json(
        {
          room: {
            building_id: room.building_id,
            room_no: room.room_no,
            floor: room.floor,
            status: room.status,
          },
        },
        201
      );
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return json({ message: "Room already exists for this building" }, 409);
      }
      throw err;
    }
  }

  if (parts.length === 4 && parts[1] === "rooms" && method === "PUT") {
    const buildingId = parseIntStrict(parts[2]);
    const roomNo = decodePart(parts[3]);
    if (!buildingId || !roomNo) return json({ message: "Invalid room key" }, 400);

    const body = await readBody(request);
    const nextRoomNo = String(body.room_no || roomNo).trim();

    const room = await Room.findOne({ building_id: buildingId, room_no: roomNo });
    if (!room) return json({ message: "Not found" }, 404);

    room.room_no = nextRoomNo;
    room.floor = body.floor !== undefined && body.floor !== "" ? Number(body.floor) : null;
    if (body.status) room.status = body.status;

    try {
      await room.save();
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return json({ message: "Room already exists for this building" }, 409);
      }
      throw err;
    }

    if (roomNo !== nextRoomNo) {
      await Tenant.updateMany(
        { building_id: buildingId, room_no: roomNo },
        { $set: { room_no: nextRoomNo } }
      );
    }

    return json({
      room: {
        building_id: room.building_id,
        room_no: room.room_no,
        floor: room.floor,
        status: room.status,
      },
    });
  }

  if (parts.length === 4 && parts[1] === "rooms" && method === "DELETE") {
    const buildingId = parseIntStrict(parts[2]);
    const roomNo = decodePart(parts[3]);
    if (!buildingId || !roomNo) return json({ message: "Invalid room key" }, 400);

    const tenantIds = (
      await Tenant.find({ building_id: buildingId, room_no: roomNo }, { tenant_id: 1 }).lean()
    ).map((t) => t.tenant_id);

    for (const tenantId of tenantIds) {
      await deleteTenantCascade(tenantId);
    }

    const deleted = await Room.findOneAndDelete({ building_id: buildingId, room_no: roomNo }).lean();
    if (!deleted) return json({ message: "Not found" }, 404);

    return json({ message: "Deleted" });
  }

  if (parts.length === 2 && parts[1] === "tenants" && method === "GET") {
    const [tenants, users, rooms, buildings] = await Promise.all([
      Tenant.find({}).lean(),
      User.find({}).lean(),
      Room.find({}).lean(),
      Building.find({}).lean(),
    ]);

    const userMap = mapBy(users, "user_id");
    const roomMap = mapByComposite(rooms, (r) => `${r.building_id}:${r.room_no}`);
    const buildingMap = mapBy(buildings, "building_id");

    const rows = tenants
      .map((tenant) => {
        const user = userMap.get(tenant.user_id);
        const room = roomMap.get(`${tenant.building_id}:${tenant.room_no}`);
        const building = buildingMap.get(tenant.building_id);

        return {
          tenant_id: tenant.tenant_id,
          full_name: tenant.full_name,
          phone: tenant.phone,
          email: tenant.email,
          username: user?.username || "",
          status: user?.status || "INACTIVE",
          room_no: tenant.room_no,
          floor: room?.floor ?? null,
          building_code: building?.building_code || "",
          building_id: tenant.building_id,
        };
      })
      .sort(sortByBuildingRoom);

    return json({ tenants: rows });
  }

  if (parts.length === 2 && parts[1] === "tenants" && method === "POST") {
    const body = await readBody(request);

    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const fullName = String(body.full_name || "").trim();
    const buildingId = parseIntStrict(body.building_id);
    const roomNo = String(body.room_no || "").trim();

    if (!username || !password || !fullName || !buildingId || !roomNo) {
      return json({ message: "Missing required fields" }, 400);
    }

    const roomExists = await Room.exists({ building_id: buildingId, room_no: roomNo });
    if (!roomExists) {
      return json({ message: "Room not found" }, 400);
    }

    const userId = await nextSequence("user_id");

    let user;
    try {
      user = await User.create({
        user_id: userId,
        username,
        password_hash: await bcrypt.hash(password, 10),
        role: "TENANT",
        status: "ACTIVE",
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return json({ message: "Username already exists" }, 409);
      }
      throw err;
    }

    try {
      const tenant = await Tenant.create({
        tenant_id: await nextSequence("tenant_id"),
        user_id: user.user_id,
        building_id: buildingId,
        room_no: roomNo,
        full_name: fullName,
        phone: body.phone || null,
        email: body.email || null,
      });

      return json({ tenant_id: tenant.tenant_id }, 201);
    } catch (err) {
      await User.deleteOne({ user_id: user.user_id });
      if (isDuplicateKeyError(err)) {
        return json({ message: "Tenant already exists for this user" }, 409);
      }
      throw err;
    }
  }

  if (parts.length === 3 && parts[1] === "tenants" && method === "PUT") {
    const tenantId = parseIntStrict(parts[2]);
    if (!tenantId) return json({ message: "Invalid tenant id" }, 400);

    const body = await readBody(request);
    const tenant = await Tenant.findOne({ tenant_id: tenantId });
    if (!tenant) return json({ message: "Not found" }, 404);

    if (body.full_name !== undefined) tenant.full_name = body.full_name || tenant.full_name;
    if (body.phone !== undefined) tenant.phone = body.phone || null;
    if (body.email !== undefined) tenant.email = body.email || null;

    const nextBuildingId = body.building_id !== undefined ? parseIntStrict(body.building_id) : tenant.building_id;
    const nextRoomNo = body.room_no !== undefined ? String(body.room_no) : tenant.room_no;

    if (nextBuildingId !== tenant.building_id || nextRoomNo !== tenant.room_no) {
      const roomExists = await Room.exists({ building_id: nextBuildingId, room_no: nextRoomNo });
      if (!roomExists) {
        return json({ message: "Room not found" }, 400);
      }
      tenant.building_id = nextBuildingId;
      tenant.room_no = nextRoomNo;
    }

    await tenant.save();

    const userUpdates = {};
    if (body.status) userUpdates.status = body.status;
    if (body.password) userUpdates.password_hash = await bcrypt.hash(String(body.password), 10);
    if (Object.keys(userUpdates).length > 0) {
      await User.updateOne({ user_id: tenant.user_id }, { $set: userUpdates });
    }

    return json({ message: "Updated" });
  }

  if (parts.length === 3 && parts[1] === "tenants" && method === "DELETE") {
    const tenantId = parseIntStrict(parts[2]);
    if (!tenantId) return json({ message: "Invalid tenant id" }, 400);

    await deleteTenantCascade(tenantId);
    return json({ message: "Deleted" });
  }

  if (parts.length === 2 && parts[1] === "officers" && method === "GET") {
    const [staff, users] = await Promise.all([Staff.find({}).lean(), User.find({ role: "OFFICER" }).lean()]);
    const userMap = mapBy(users, "user_id");

    const officers = staff
      .filter((s) => userMap.get(s.user_id))
      .map((s) => {
        const user = userMap.get(s.user_id);
        return {
          staff_id: s.staff_id,
          full_name: s.full_name,
          phone: s.phone,
          email: s.email,
          username: user?.username || "",
          status: user?.status || "INACTIVE",
        };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    return json({ officers });
  }

  if (parts.length === 2 && parts[1] === "officers" && method === "POST") {
    const body = await readBody(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const fullName = String(body.full_name || "").trim();

    if (!username || !password || !fullName) {
      return json({ message: "Missing required fields" }, 400);
    }

    const userId = await nextSequence("user_id");

    let user;
    try {
      user = await User.create({
        user_id: userId,
        username,
        password_hash: await bcrypt.hash(password, 10),
        role: "OFFICER",
        status: "ACTIVE",
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return json({ message: "Username already exists" }, 409);
      }
      throw err;
    }

    const staff = await Staff.create({
      staff_id: await nextSequence("staff_id"),
      user_id: user.user_id,
      full_name: fullName,
      phone: body.phone || null,
      email: body.email || null,
    });

    return json({ staff_id: staff.staff_id }, 201);
  }

  if (parts.length === 3 && parts[1] === "officers" && method === "PUT") {
    const staffId = parseIntStrict(parts[2]);
    if (!staffId) return json({ message: "Invalid staff id" }, 400);

    const body = await readBody(request);
    const staff = await Staff.findOne({ staff_id: staffId });
    if (!staff) return json({ message: "Not found" }, 404);

    if (body.full_name !== undefined) staff.full_name = body.full_name || staff.full_name;
    if (body.phone !== undefined) staff.phone = body.phone || null;
    if (body.email !== undefined) staff.email = body.email || null;
    await staff.save();

    const userUpdates = {};
    if (body.status) userUpdates.status = body.status;
    if (body.password) userUpdates.password_hash = await bcrypt.hash(String(body.password), 10);
    if (Object.keys(userUpdates).length > 0) {
      await User.updateOne({ user_id: staff.user_id }, { $set: userUpdates });
    }

    return json({ message: "Updated" });
  }

  if (parts.length === 3 && parts[1] === "officers" && method === "DELETE") {
    const staffId = parseIntStrict(parts[2]);
    if (!staffId) return json({ message: "Invalid staff id" }, 400);

    await deleteStaffCascade(staffId);
    return json({ message: "Deleted" });
  }

  if (parts.length === 2 && parts[1] === "packages" && method === "GET") {
    const params = request.nextUrl.searchParams;

    const filters = {};
    const status = params.get("status");
    if (status) filters.current_status = status;

    const range = buildDateRange({
      period: params.get("period"),
      start_date: params.get("start_date"),
      end_date: params.get("end_date"),
      date: null,
      defaultToday: false,
    });
    if (range) filters.arrived_at = range;

    const rawPackages = await Package.find(filters).sort({ arrived_at: -1 }).limit(300).lean();
    const packages = await hydratePackages(rawPackages);

    return json({ packages });
  }

  if (parts.length === 2 && parts[1] === "packages" && method === "POST") {
    return json(
      { message: "Admins cannot create packages; please use officer workflow." },
      403
    );
  }

  if (parts.length === 3 && parts[1] === "packages" && method === "GET") {
    const packageId = parseIntStrict(parts[2]);
    if (!packageId) return json({ message: "Invalid package id" }, 400);

    const pkg = await Package.findOne({ package_id: packageId }).lean();
    if (!pkg) return json({ message: "Not found" }, 404);

    const [tenant, building, staff, latestLog] = await Promise.all([
      Tenant.findOne({ tenant_id: pkg.tenant_id }).lean(),
      (async () => {
        const t = await Tenant.findOne({ tenant_id: pkg.tenant_id }).lean();
        if (!t) return null;
        return Building.findOne({ building_id: t.building_id }).lean();
      })(),
      pkg.received_by_staff_id
        ? Staff.findOne({ staff_id: pkg.received_by_staff_id }).lean()
        : Promise.resolve(null),
      PackageStatusLog.findOne({ package_id: packageId }).sort({ status_time: -1 }).lean(),
    ]);

    return json({
      package: {
        package_id: pkg.package_id,
        tracking_no: pkg.tracking_no,
        carrier: pkg.carrier,
        current_status: pkg.current_status,
        arrived_at: pkg.arrived_at,
        picked_up_at: pkg.picked_up_at,
        tenant_name: tenant?.full_name || null,
        building_code: building?.building_code || null,
        room_no: tenant?.room_no || null,
        handled_by_staff: staff?.full_name || null,
      },
      latestNote: latestLog?.note || "",
    });
  }

  if (parts.length === 3 && parts[1] === "packages" && method === "PATCH") {
    const packageId = parseIntStrict(parts[2]);
    if (!packageId) return json({ message: "Invalid package id" }, 400);

    const body = await readBody(request);
    const status = body.status;
    const staffId = parseIntStrict(body.staff_id);

    if (!staffId) {
      return json({ message: "staff_id required for logging" }, 400);
    }

    if (status && !PACKAGE_STATUS_ALLOWED.includes(status)) {
      return json({ message: "Invalid status" }, 400);
    }

    const pkg = await Package.findOne({ package_id: packageId });
    if (!pkg) return json({ message: "Not found" }, 404);

    if (status) {
      pkg.current_status = status;
      if (status === "PICKED_UP") {
        pkg.picked_up_at = new Date();
      } else if (status === "ARRIVED") {
        pkg.picked_up_at = null;
      }
    }

    await pkg.save();

    await PackageStatusLog.create({
      package_id: packageId,
      updated_by_staff_id: staffId,
      status: status || pkg.current_status,
      note: body.note || "",
      status_time: new Date(),
    });

    return json({ message: "Updated" });
  }

  if (parts.length === 3 && parts[1] === "packages" && method === "DELETE") {
    const packageId = parseIntStrict(parts[2]);
    if (!packageId) return json({ message: "Invalid package id" }, 400);

    await PackageStatusLog.deleteMany({ package_id: packageId });
    const deleted = await Package.findOneAndDelete({ package_id: packageId }).lean();
    if (!deleted) return json({ message: "Not found" }, 404);

    return json({ message: "Deleted" });
  }

  if (parts.length === 2 && parts[1] === "package-log" && method === "GET") {
    const status = request.nextUrl.searchParams.get("status");
    const filters = status ? { status } : {};

    const logs = await PackageStatusLog.find(filters).sort({ status_time: -1 }).limit(400).lean();
    const rows = await hydrateLogs(logs);

    return json({ logs: rows });
  }

  return json({ message: "Not found" }, 404);
}

async function routeRequest(method, request) {
  await connectToDatabase();

  const pathname = request.nextUrl.pathname || "";
  const rawParts = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const parts = rawParts.map(decodePart);

  if (parts.length === 0) {
    return json({ message: "Not found" }, 404);
  }

  if (parts[0] === "auth") {
    return handleAuth(method, parts, request);
  }

  if (parts[0] === "officer") {
    return handleOfficer(method, parts, request);
  }

  if (parts[0] === "tenant") {
    return handleTenant(method, parts, request);
  }

  if (parts[0] === "admin") {
    return handleAdmin(method, parts, request);
  }

  return json({ message: "Not found" }, 404);
}

export async function GET(request) {
  try {
    return await routeRequest("GET", request);
  } catch (err) {
    console.error(err);
    return json({ message: "Server error" }, 500);
  }
}

export async function POST(request) {
  try {
    return await routeRequest("POST", request);
  } catch (err) {
    console.error(err);
    return json({ message: "Server error" }, 500);
  }
}

export async function PUT(request) {
  try {
    return await routeRequest("PUT", request);
  } catch (err) {
    console.error(err);
    return json({ message: "Server error" }, 500);
  }
}

export async function PATCH(request) {
  try {
    return await routeRequest("PATCH", request);
  } catch (err) {
    console.error(err);
    return json({ message: "Server error" }, 500);
  }
}

export async function DELETE(request) {
  try {
    return await routeRequest("DELETE", request);
  } catch (err) {
    console.error(err);
    return json({ message: "Server error" }, 500);
  }
}

export async function OPTIONS() {
  return empty(204);
}

