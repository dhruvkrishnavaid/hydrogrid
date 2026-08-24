-- HydroGrid PostgreSQL / Supabase Database Schema
-- Frozen MVP Specification

-- 1. Custom Types & Enums
DO $$ BEGIN
    CREATE TYPE site_status AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE device_type AS ENUM ('SOURCE_SENSOR_NODE', 'PURIFICATION_CONTROLLER', 'DISTRIBUTION_NODE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE device_status AS ENUM ('ONLINE', 'DEGRADED', 'OFFLINE', 'FAULT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('WARNING', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('UNREAD', 'READ', 'ACKNOWLEDGED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sensor_health_status AS ENUM ('HEALTHY', 'DEGRADED', 'CALIBRATION_REQUIRED', 'FAULT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE filter_type AS ENUM ('SEDIMENT', 'CARBON', 'CALCITE', 'UV');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE filter_status AS ENUM ('HEALTHY', 'WARNING', 'DEGRADED', 'FAULT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Sites Table
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    village TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status site_status NOT NULL DEFAULT 'ONLINE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type device_type NOT NULL,
    status device_status NOT NULL DEFAULT 'ONLINE',
    firmware_version TEXT NOT NULL DEFAULT '1.0.0',
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Site Memberships Table (User -> Site relation with role)
CREATE TABLE IF NOT EXISTS site_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_site_membership UNIQUE (user_id, site_id)
);

-- 5. Quality Configurations Table (Site-specific safety thresholds)
CREATE TABLE IF NOT EXISTS quality_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE UNIQUE,
    min_ph DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    max_ph DOUBLE PRECISION NOT NULL DEFAULT 8.5,
    max_tds DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    max_turbidity DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    max_flow_mismatch_percent DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    severity event_severity NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'WARNING',
    status alert_status NOT NULL DEFAULT 'UNREAD',
    message TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Sensor Calibration Table
CREATE TABLE IF NOT EXISTS sensor_calibrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    sensor TEXT NOT NULL,
    status sensor_health_status NOT NULL DEFAULT 'HEALTHY',
    offset DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_calibrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_calibration_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Filter Maintenance Table
CREATE TABLE IF NOT EXISTS filter_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    filter_type filter_type NOT NULL,
    status filter_status NOT NULL DEFAULT 'HEALTHY',
    life_percent DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    last_serviced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_service_due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_devices_site_id ON devices(site_id);
CREATE INDEX IF NOT EXISTS idx_site_memberships_user ON site_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_site_memberships_site ON site_memberships(site_id);
CREATE INDEX IF NOT EXISTS idx_events_site_created ON events(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_site_status ON alerts(site_id, status);
CREATE INDEX IF NOT EXISTS idx_sensor_calibrations_site ON sensor_calibrations(site_id);
CREATE INDEX IF NOT EXISTS idx_filter_maintenance_site ON filter_maintenance(site_id);
