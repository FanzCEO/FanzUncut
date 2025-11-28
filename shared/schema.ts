import { sql } from "drizzle-orm";
import {
  index,
  unique,
  check,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  pgEnum,
  bigserial,
  bigint,
  inet,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ===== MULTI-TENANT CORE SCHEMA =====
// Core tenancy and identity system for FANZ empire (GirlFanz, PupFanz, DaddyFanz, etc.)

// Tenant definitions - each brand in the FANZ empire
export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "inactive",
  "maintenance",
]);

export const tenants = pgTable("tenants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: varchar("slug").unique().notNull(), // girlfanz, pupfanz, daddyfanz, taboofanz, transfanz
  name: varchar("name").notNull(), // GirlFanz, PupFanz, DaddyFanz, TabooFanz, TransFanz
  domain: varchar("domain"), // girlfanz.com, pupfanz.com, etc.
  status: tenantStatusEnum("status").default("active").notNull(),
  settings: jsonb("settings").default({}), // brand-specific configs, themes, features
  branding: jsonb("branding").default({}), // colors, logos, messaging
  features: jsonb("features").default({}), // feature flags per tenant
  compliance: jsonb("compliance").default({}), // jurisdiction-specific rules
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unified account system - one account across all FANZ empire brands
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "disabled",
  "pending",
  "suspended",
]);

export const accounts = pgTable(
  "accounts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: varchar("email").unique().notNull(), // using citext equivalent
    phone: varchar("phone"),
    passwordHash: varchar("password_hash"), // null for social-only accounts
    status: accountStatusEnum("status").default("active").notNull(),
    emailVerified: boolean("email_verified").default(false),
    phoneVerified: boolean("phone_verified").default(false),
    lastLoginAt: timestamp("last_login_at"),
    metadata: jsonb("metadata").default({}), // additional account data
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_accounts_email").on(table.email),
    index("idx_accounts_status").on(table.status),
  ],
);

// External identity providers (OIDC, OAuth2, SAML)
export const accountIdentity = pgTable(
  "account_identity",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountId: varchar("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    provider: varchar("provider").notNull(), // google, twitter, discord, replit, etc.
    subject: varchar("subject").notNull(), // provider's user ID
    metadata: jsonb("metadata").default({}), // provider-specific data
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique().on(table.provider, table.subject),
    index("idx_account_identity_account").on(table.accountId),
  ],
);

// Role-based access control system
export const roleScope = pgEnum("role_scope", ["global", "tenant"]);

export const roles = pgTable(
  "roles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    scope: roleScope("scope").default("tenant").notNull(),
    permissions: text("permissions").array().default([]), // content:write, ads:manage, etc.
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [unique().on(table.name, table.scope)],
);

// Account role assignments
export const accountRole = pgTable(
  "account_role",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountId: varchar("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    roleId: varchar("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }), // null for global roles
    grantedBy: varchar("granted_by").references(() => accounts.id),
    expiresAt: timestamp("expires_at"), // optional role expiration
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique().on(table.accountId, table.roleId, table.tenantId),
    index("idx_account_role_account").on(table.accountId),
    index("idx_account_role_tenant").on(table.tenantId),
  ],
);

// Unified profile system - creator/fan profiles are global with per-tenant presence
export const profileTypeEnum = pgEnum("profile_type", [
  "creator",
  "fan",
  "staff",
  "admin",
]);

// KYC and compliance enums for profiles
export const profileKycStatusEnum = pgEnum("profile_kyc_status", [
  "pending",
  "verified",
  "rejected",
  "expired",
]);
export const sanctionsStatusEnum = pgEnum("sanctions_status", [
  "clear",
  "pending",
  "blocked",
  "reviewing",
]);

export const profiles = pgTable(
  "profiles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountId: varchar("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    handle: varchar("handle").unique().notNull(), // global handle across all tenants
    displayName: varchar("display_name"),
    bio: text("bio"),
    type: profileTypeEnum("type").default("fan").notNull(),
    avatarUrl: varchar("avatar_url"),
    bannerUrl: varchar("banner_url"),
    location: varchar("location"),
    website: varchar("website"),
    socialLinks: jsonb("social_links").default({}), // twitter, instagram, etc.
    flags: jsonb("flags").default({}), // profile flags and settings
    preferences: jsonb("preferences").default({}), // user preferences
    stats: jsonb("stats").default({}), // follower counts, engagement, etc.
    verificationLevel: integer("verification_level").default(0), // 0=unverified, 1=verified, 2=official

    // Compliance fields for quick auth middleware checks
    kycStatus: profileKycStatusEnum("kyc_status").default("pending"),
    ageVerified: boolean("age_verified").default(false),
    is2257Compliant: boolean("is_2257_compliant").default(false),
    lastSanctionsScreening: timestamp("last_sanctions_screening"),
    sanctionsStatus: sanctionsStatusEnum("sanctions_status").default("clear"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_profiles_handle").on(table.handle),
    index("idx_profiles_account").on(table.accountId),
    index("idx_profiles_type").on(table.type),
    index("idx_profiles_kyc_status").on(table.kycStatus),
    index("idx_profiles_sanctions_status").on(table.sanctionsStatus),
  ],
);

// Per-tenant profile presence and visibility
export const profileTenant = pgTable(
  "profile_tenant",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    profileId: varchar("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    isVisible: boolean("is_visible").default(true),
    isActive: boolean("is_active").default(true),
    settings: jsonb("settings").default({}), // tenant-specific profile settings
    customization: jsonb("customization").default({}), // tenant-specific branding
    stats: jsonb("stats").default({}), // tenant-specific stats
    joinedAt: timestamp("joined_at").defaultNow(),
    lastActiveAt: timestamp("last_active_at").defaultNow(),
  },
  (table) => [
    unique().on(table.profileId, table.tenantId),
    index("idx_profile_tenant_profile").on(table.profileId),
    index("idx_profile_tenant_tenant").on(table.tenantId),
  ],
);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", [
  "fan",
  "creator",
  "moderator",
  "admin",
]);
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "pending",
]);

// Users table for both Replit Auth and local username/password auth
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: varchar("username").unique(), // For local auth
  email: varchar("email").unique(),
  password: varchar("password"), // For local auth (hashed)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("fan").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  authProvider: varchar("auth_provider").default("replit").notNull(), // "replit" or "local"
  onlineStatus: boolean("online_status").default(false),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social Accounts table - links social provider accounts to users
export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider").notNull(), // 'google', 'facebook', 'twitter', 'discord', 'github'
    providerId: varchar("provider_id").notNull(), // User ID from the provider
    email: varchar("email"),
    displayName: varchar("display_name"),
    profileUrl: varchar("profile_url"),
    profileImageUrl: varchar("profile_image_url"),
    accessToken: text("access_token"), // Encrypted OAuth access token
    refreshToken: text("refresh_token"), // Encrypted OAuth refresh token
    expiresAt: timestamp("expires_at"), // Token expiration
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.provider, table.providerId), // Unique constraint per provider
    index("idx_social_accounts_user").on(table.userId),
    index("idx_social_accounts_provider").on(table.provider),
  ],
);

// ===== COMPREHENSIVE COMPLIANCE SYSTEM =====
// 2257, KYC/KYB, Identity Verification, Model Releases

// Enhanced identity verification system
export const verificationCheckType = pgEnum("verification_check_type", [
  "KYC",
  "Age",
  "KYB",
  "Sanctions",
]);
export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
  "requires_review",
]);

export const identityVerifications = pgTable(
  "identity_verifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountId: varchar("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    profileId: varchar("profile_id").references(() => profiles.id), // optional profile context
    vendor: varchar("vendor").notNull(), // verifymy, jumio, onfido, etc.
    checkType: verificationCheckType("check_type").notNull(),
    status: verificationStatus("status").default("pending").notNull(),
    externalId: varchar("external_id"), // vendor's verification ID
    result: jsonb("result").default({}), // verification results
    documents: jsonb("documents").default({}), // document metadata
    biometrics: jsonb("biometrics").default({}), // biometric check results
    sanctions: jsonb("sanctions").default({}), // sanctions screening results
    riskScore: integer("risk_score"), // vendor risk assessment
    failureReason: text("failure_reason"),
    reviewNotes: text("review_notes"), // manual review notes
    reviewedBy: varchar("reviewed_by").references(() => accounts.id),
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    expiresAt: timestamp("expires_at"), // when verification expires
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_identity_verifications_account").on(table.accountId),
    index("idx_identity_verifications_profile").on(table.profileId),
    index("idx_identity_verifications_status").on(table.status),
    index("idx_identity_verifications_vendor").on(table.vendor),
  ],
);

// Model releases for content compliance
export const modelReleaseStatus = pgEnum("model_release_status", [
  "pending",
  "signed",
  "expired",
  "revoked",
]);

export const modelReleases = pgTable(
  "model_releases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    performerProfileId: varchar("performer_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    creatorProfileId: varchar("creator_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    status: modelReleaseStatus("status").default("pending").notNull(),
    releaseType: varchar("release_type").notNull(), // standard, commercial, exclusive
    signedAt: timestamp("signed_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    documents: jsonb("documents").default({}), // signed documents metadata
    terms: jsonb("terms").default({}), // release terms and conditions
    compensation: jsonb("compensation").default({}), // compensation terms
    jurisdiction: varchar("jurisdiction"), // legal jurisdiction
    ipAddress: inet("ip_address"), // signing IP for audit
    userAgent: text("user_agent"), // signing user agent
    digitalSignature: text("digital_signature"), // cryptographic signature
    witnessInfo: jsonb("witness_info").default({}), // witness information if required
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_model_releases_content").on(table.contentId),
    index("idx_model_releases_performer").on(table.performerProfileId),
    index("idx_model_releases_creator").on(table.creatorProfileId),
    index("idx_model_releases_tenant").on(table.tenantId),
    index("idx_model_releases_status").on(table.status),
  ],
);

// Enhanced 2257 record keeping system
export const record2257Type = pgEnum("record_2257_type", [
  "id_verification",
  "consent_form",
  "model_release",
  "age_verification",
  "performer_agreement",
]);

export const records2257 = pgTable(
  "records_2257",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    performerProfileId: varchar("performer_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    custodianAccountId: varchar("custodian_account_id")
      .notNull()
      .references(() => accounts.id), // record custodian
    docType: record2257Type("doc_type").notNull(),
    locationUri: text("location_uri").notNull(), // where records are stored
    indexMetadata: jsonb("index_metadata").default({}), // catalog and retrieval info
    custodianContact: jsonb("custodian_contact").default({}), // custodian contact info
    jurisdiction: varchar("jurisdiction").notNull(), // legal jurisdiction
    retentionPeriod: integer("retention_period").default(7), // years to retain
    isDigital: boolean("is_digital").default(true),
    physicalLocation: text("physical_location"), // for physical records
    accessLog: jsonb("access_log").default([]), // who accessed when
    verificationChecksum: varchar("verification_checksum"), // for integrity verification
    encryptionKeyId: varchar("encryption_key_id"), // KMS key for encrypted records
    complianceNotes: text("compliance_notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_records_2257_content").on(table.contentId),
    index("idx_records_2257_performer").on(table.performerProfileId),
    index("idx_records_2257_custodian").on(table.custodianAccountId),
    index("idx_records_2257_type").on(table.docType),
    index("idx_records_2257_jurisdiction").on(table.jurisdiction),
  ],
);

// Enhanced audit logging with multi-tenant support
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(), // use bigserial for high volume
    actorAccountId: varchar("actor_account_id").references(() => accounts.id), // who performed the action
    actorProfileId: varchar("actor_profile_id").references(() => profiles.id), // profile context
    tenantId: varchar("tenant_id").references(() => tenants.id), // tenant context
    action: varchar("action").notNull(), // what action was performed
    subjectTable: varchar("subject_table").notNull(), // which table was affected
    subjectId: varchar("subject_id").notNull(), // which record was affected
    changes: jsonb("changes").default({}), // before/after diff
    metadata: jsonb("metadata").default({}), // additional context
    ipAddress: inet("ip_address"), // source IP
    userAgent: text("user_agent"), // user agent string
    sessionId: varchar("session_id"), // session identifier
    requestId: varchar("request_id"), // request correlation ID
    severity: varchar("severity").default("info"), // info, warning, error, critical
    tags: text("tags").array().default([]), // searchable tags
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_actor_account").on(table.actorAccountId),
    index("idx_audit_logs_actor_profile").on(table.actorProfileId),
    index("idx_audit_logs_tenant").on(table.tenantId),
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_subject").on(table.subjectTable, table.subjectId),
    index("idx_audit_logs_timestamp").on(table.timestamp),
    index("idx_audit_logs_severity").on(table.severity),
  ],
);

// ===== ENHANCED CONTENT & MEDIA SYSTEM =====
// Cross-platform content publishing with forensic media hub

// Content visibility levels
export const contentVisibilityEnum = pgEnum("content_visibility", [
  "public",
  "subscribers",
  "ppv",
  "private",
]);
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
  "deleted",
]);

// Enhanced content system for cross-platform publishing
export const content = pgTable(
  "content",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorProfileId: varchar("creator_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: varchar("title").notNull(),
    caption: text("caption"),
    description: text("description"),
    priceCents: integer("price_cents").default(0), // 0 for free, >0 for PPV
    visibility: contentVisibilityEnum("visibility").default("public").notNull(),
    status: contentStatusEnum("status").default("draft").notNull(),
    canonicalTenant: varchar("canonical_tenant")
      .notNull()
      .references(() => tenants.id), // original brand
    tags: text("tags").array().default([]),
    metadata: jsonb("metadata").default({}), // additional content metadata
    analytics: jsonb("analytics").default({}), // view counts, engagement metrics
    scheduledFor: timestamp("scheduled_for"), // for scheduled posts
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_content_creator").on(table.creatorProfileId),
    index("idx_content_tenant").on(table.canonicalTenant),
    index("idx_content_status").on(table.status),
    index("idx_content_published").on(table.publishedAt),
  ],
);

// Cross-posting mapping - one content, many tenants
export const contentTenantMap = pgTable(
  "content_tenant_map",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    status: contentStatusEnum("status").default("published").notNull(),
    customization: jsonb("customization").default({}), // tenant-specific customizations
    publishedAt: timestamp("published_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique().on(table.contentId, table.tenantId),
    index("idx_content_tenant_map_content").on(table.contentId),
    index("idx_content_tenant_map_tenant").on(table.tenantId),
  ],
);

// Forensic Media Hub - enhanced media system with forensic capabilities
export const mediaStatusEnum = pgEnum("media_status", [
  "pending",
  "processing",
  "approved",
  "rejected",
  "flagged",
  "ai_reviewing",
  "escalated",
]);
export const moderationStateEnum = pgEnum("moderation_state", [
  "pending",
  "approved",
  "rejected",
  "escalated",
]);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").references(() => content.id, {
      onDelete: "cascade",
    }),
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: varchar("title"),
    description: text("description"),
    storageKey: varchar("storage_key").notNull(), // S3/object storage key
    mimeType: varchar("mime_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    duration: integer("duration"), // seconds for video/audio
    width: integer("width"), // for images/video
    height: integer("height"), // for images/video

    // Forensic signature and integrity
    checksumSha256: varchar("checksum_sha256").notNull(),
    perceptualHash: varchar("perceptual_hash"), // pHash for duplicate detection
    forensicWatermark: jsonb("forensic_watermark").default({}), // watermark metadata
    forensicSignature: text("forensic_signature"), // unique content fingerprint
    watermarked: boolean("watermarked").default(false),
    watermarkedAt: timestamp("watermarked_at"),

    // Content analysis and moderation
    status: mediaStatusEnum("status").default("pending").notNull(),
    moderationState: moderationStateEnum("moderation_state")
      .default("pending")
      .notNull(),
    aiAnalysis: jsonb("ai_analysis").default({}), // AI analysis results
    riskScore: integer("risk_score").default(0), // 0-100 risk assessment
    flags: jsonb("flags").default({}), // moderation flags
    contentTags: text("content_tags").array().default([]),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_media_assets_content").on(table.contentId),
    index("idx_media_assets_owner").on(table.ownerId),
    index("idx_media_assets_status").on(table.status),
    index("idx_media_assets_checksum").on(table.checksumSha256),
    index("idx_media_assets_perceptual").on(table.perceptualHash),
  ],
);

// Media variants - different renditions per tenant/device
export const mediaVariantKind = pgEnum("media_variant_kind", [
  "original",
  "hls",
  "dash",
  "thumbnail",
  "preview",
  "watermarked",
]);

export const mediaVariants = pgTable(
  "media_variants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    assetId: varchar("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }), // null for global variants
    kind: mediaVariantKind("kind").notNull(),
    storageKey: varchar("storage_key").notNull(),
    mimeType: varchar("mime_type"),
    fileSize: bigint("file_size", { mode: "number" }),
    quality: varchar("quality"), // 720p, 1080p, etc.
    drmKeyId: varchar("drm_key_id"), // for encrypted content
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_media_variants_asset").on(table.assetId),
    index("idx_media_variants_tenant").on(table.tenantId),
    unique().on(table.assetId, table.tenantId, table.kind),
  ],
);

// Moderation queue
export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "approved",
  "rejected",
  "escalated",
  "auto_approved",
  "auto_rejected",
]);

export const moderationQueue = pgTable("moderation_queue", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  mediaId: varchar("media_id")
    .notNull()
    .references(() => mediaAssets.id, { onDelete: "cascade" }),
  reason: text("reason"),
  status: moderationStatusEnum("status").default("pending").notNull(),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  notes: text("notes"),
  decidedAt: timestamp("decided_at"),
  aiRecommendation: varchar("ai_recommendation"),
  aiConfidence: integer("ai_confidence"),
  escalationReason: text("escalation_reason"),
  priority: integer("priority").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===== ENHANCED COMMERCE SYSTEM =====
// Multi-tenant subscription and payment infrastructure

// Enhanced subscription plans with tenant support
export const subscriptionInterval = pgEnum("subscription_interval", [
  "monthly",
  "yearly",
  "lifetime",
]);

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorProfileId: varchar("creator_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }), // null for global plans
    name: varchar("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    currency: varchar("currency").default("USD").notNull(),
    interval: subscriptionInterval("interval").default("monthly").notNull(),
    features: jsonb("features").default({}), // plan features and perks
    trialDays: integer("trial_days").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_subscription_plans_creator").on(table.creatorProfileId),
    index("idx_subscription_plans_tenant").on(table.tenantId),
  ],
);

// Enhanced subscriptions with cross-tenant support
export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "unpaid",
  "trialing",
  "incomplete",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fanProfileId: varchar("fan_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    planId: varchar("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id").references(() => tenants.id), // subscription context
    status: subscriptionStatus("status").default("active").notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    canceledAt: timestamp("canceled_at"),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_subscriptions_fan").on(table.fanProfileId),
    index("idx_subscriptions_plan").on(table.planId),
    index("idx_subscriptions_tenant").on(table.tenantId),
    index("idx_subscriptions_status").on(table.status),
  ],
);

// Enhanced purchases (PPV, tips, etc.)
export const purchaseType = pgEnum("purchase_type", [
  "ppv",
  "tip",
  "subscription",
  "bundle",
  "live_stream",
]);
export const purchaseStatus = pgEnum("purchase_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
  "disputed",
]);

export const purchases = pgTable(
  "purchases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fanProfileId: varchar("fan_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    creatorProfileId: varchar("creator_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    contentId: varchar("content_id").references(() => content.id),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    type: purchaseType("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency").default("USD").notNull(),
    status: purchaseStatus("status").default("pending").notNull(),
    provider: varchar("provider"), // payment provider
    providerRef: varchar("provider_ref"), // provider transaction ID
    platformFeeCents: integer("platform_fee_cents").default(0),
    creatorEarningsCents: integer("creator_earnings_cents").notNull(),
    metadata: jsonb("metadata").default({}),
    refundedAt: timestamp("refunded_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_purchases_fan").on(table.fanProfileId),
    index("idx_purchases_creator").on(table.creatorProfileId),
    index("idx_purchases_content").on(table.contentId),
    index("idx_purchases_tenant").on(table.tenantId),
    index("idx_purchases_status").on(table.status),
  ],
);

// Enhanced payout accounts with KYC support
export const payoutAccountStatus = pgEnum("payout_account_status", [
  "active",
  "inactive",
  "suspended",
  "pending_verification",
]);

export const payoutAccounts = pgTable(
  "payout_accounts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    profileId: varchar("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    provider: varchar("provider").notNull(), // stripe, paypal, wise, etc.
    externalAccountId: varchar("external_account_id").notNull(),
    status: payoutAccountStatus("status")
      .default("pending_verification")
      .notNull(),
    kycStatus: varchar("kyc_status"), // KYC verification status
    country: varchar("country", { length: 2 }), // ISO country code
    currency: varchar("currency").default("USD").notNull(),
    accountType: varchar("account_type"), // individual, business
    last4: varchar("last4"), // last 4 digits for display
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_payout_accounts_profile").on(table.profileId),
    index("idx_payout_accounts_status").on(table.status),
  ],
);

// Enhanced payouts with scheduling and batching
export const payoutStatus = pgEnum("payout_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "scheduled",
]);

export const payouts = pgTable(
  "payouts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    profileId: varchar("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    payoutAccountId: varchar("payout_account_id")
      .notNull()
      .references(() => payoutAccounts.id),
    tenantId: varchar("tenant_id").references(() => tenants.id), // which tenant triggered payout
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency").default("USD").notNull(),
    status: payoutStatus("status").default("pending").notNull(),
    scheduledFor: timestamp("scheduled_for"), // for scheduled payouts
    provider: varchar("provider"),
    providerBatchId: varchar("provider_batch_id"), // for batch processing
    providerRef: varchar("provider_ref"),
    failureReason: text("failure_reason"),
    metadata: jsonb("metadata").default({}),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_payouts_profile").on(table.profileId),
    index("idx_payouts_account").on(table.payoutAccountId),
    index("idx_payouts_tenant").on(table.tenantId),
    index("idx_payouts_status").on(table.status),
    index("idx_payouts_scheduled").on(table.scheduledFor),
  ],
);

// ===== DYNAMIC PRICING AI SYSTEM =====
// Real-time AI-powered price optimization based on demand, engagement, and market conditions

export const pricingStrategyEnum = pgEnum("pricing_strategy", [
  "fixed",           // Static pricing
  "dynamic",         // AI-optimized real-time pricing
  "tiered",          // Volume-based tiered pricing
  "auction",         // Bid-based pricing
  "time_decay",      // Price decreases over time
  "demand_based",    // Adjusts based on demand signals
  "competitive",     // Mirrors competitor pricing
]);

export const pricingRuleStatus = pgEnum("pricing_rule_status", [
  "active",
  "paused",
  "testing",
  "archived",
]);

// Pricing rules - Define AI pricing strategies for content and subscriptions
export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorProfileId: varchar("creator_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    contentId: varchar("content_id").references(() => content.id, { onDelete: "cascade" }), // null = applies to subscriptions
    planId: varchar("plan_id").references(() => subscriptionPlans.id, { onDelete: "cascade" }), // null = applies to content
    
    name: varchar("name").notNull(),
    strategy: pricingStrategyEnum("strategy").default("dynamic").notNull(),
    status: pricingRuleStatus("status").default("active").notNull(),
    
    // Pricing bounds
    basePriceCents: integer("base_price_cents").notNull(), // Starting/minimum price
    minPriceCents: integer("min_price_cents").notNull(), // Floor price
    maxPriceCents: integer("max_price_cents").notNull(), // Ceiling price
    currentPriceCents: integer("current_price_cents").notNull(), // Active price
    
    // AI optimization parameters
    aiModel: varchar("ai_model").default("gpt-4o-mini"), // OpenAI model for price optimization
    optimizationGoal: varchar("optimization_goal").default("revenue"), // revenue, engagement, subscribers
    demandElasticity: decimal("demand_elasticity", { precision: 5, scale: 2 }).default("0.00"), // -1.0 to 1.0
    
    // Market signals and triggers
    triggers: jsonb("triggers").default({}), // Conditions that trigger price adjustments
    constraints: jsonb("constraints").default({}), // Business rules and limits
    metadata: jsonb("metadata").default({}), // Additional configuration
    
    // Performance tracking
    totalRevenueCents: bigint("total_revenue_cents", { mode: "number" }).default(0),
    totalSales: integer("total_sales").default(0),
    conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0.00"),
    avgTransactionCents: integer("avg_transaction_cents").default(0),
    
    lastOptimizedAt: timestamp("last_optimized_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_pricing_rules_creator").on(table.creatorProfileId),
    index("idx_pricing_rules_content").on(table.contentId),
    index("idx_pricing_rules_plan").on(table.planId),
    index("idx_pricing_rules_status").on(table.status),
  ],
);

// Pricing history - Track all price changes and their impact
export const pricingHistory = pgTable(
  "pricing_history",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ruleId: varchar("rule_id")
      .notNull()
      .references(() => pricingRules.id, { onDelete: "cascade" }),
    
    previousPriceCents: integer("previous_price_cents").notNull(),
    newPriceCents: integer("new_price_cents").notNull(),
    changePercent: decimal("change_percent", { precision: 5, scale: 2 }).notNull(),
    
    reason: varchar("reason").notNull(), // ai_optimization, manual_override, demand_spike, etc.
    triggerData: jsonb("trigger_data").default({}), // What triggered the change
    aiRationale: text("ai_rationale"), // AI's explanation for the change
    
    // Impact metrics (measured after price change)
    salesBefore: integer("sales_before").default(0),
    salesAfter: integer("sales_after").default(0),
    revenueBefore: bigint("revenue_before", { mode: "number" }).default(0),
    revenueAfter: bigint("revenue_after", { mode: "number" }).default(0),
    impactScore: decimal("impact_score", { precision: 5, scale: 2 }), // -100 to 100
    
    effectiveFrom: timestamp("effective_from").notNull(),
    effectiveUntil: timestamp("effective_until"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_pricing_history_rule").on(table.ruleId),
    index("idx_pricing_history_effective").on(table.effectiveFrom),
  ],
);

// Pricing insights - AI-generated recommendations and market analysis
export const insightType = pgEnum("insight_type", [
  "price_recommendation",
  "demand_forecast",
  "competitor_analysis",
  "revenue_optimization",
  "engagement_trend",
  "seasonal_pattern",
]);

export const insightPriority = pgEnum("insight_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const pricingInsights = pgTable(
  "pricing_insights",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorProfileId: varchar("creator_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    ruleId: varchar("rule_id").references(() => pricingRules.id, { onDelete: "cascade" }),
    
    type: insightType("type").notNull(),
    priority: insightPriority("priority").default("medium").notNull(),
    
    title: varchar("title").notNull(),
    description: text("description").notNull(),
    recommendation: text("recommendation"), // Action to take
    
    // AI analysis
    aiModel: varchar("ai_model").notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(), // 0-100
    dataPoints: jsonb("data_points").default({}), // Supporting data
    predictedImpact: jsonb("predicted_impact").default({}), // Expected outcomes
    
    // Actionable data
    suggestedPriceCents: integer("suggested_price_cents"),
    expectedRevenueIncrease: decimal("expected_revenue_increase", { precision: 5, scale: 2 }),
    
    actionTaken: boolean("action_taken").default(false),
    actionTakenAt: timestamp("action_taken_at"),
    actualImpact: jsonb("actual_impact").default({}), // Measured results
    
    expiresAt: timestamp("expires_at"), // Insights have shelf life
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_pricing_insights_creator").on(table.creatorProfileId),
    index("idx_pricing_insights_rule").on(table.ruleId),
    index("idx_pricing_insights_type").on(table.type),
    index("idx_pricing_insights_priority").on(table.priority),
  ],
);

// ===== CROSS-PLATFORM ADVERTISING SYSTEM =====
// Unified advertising network across all FANZ empire brands

// Ad campaign management
export const adCampaignStatus = pgEnum("ad_campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]);
export const adCampaignType = pgEnum("ad_campaign_type", [
  "content_promotion",
  "profile_promotion",
  "brand_awareness",
  "cross_platform",
]);

export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    advertiserProfileId: varchar("advertiser_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id").references(() => tenants.id), // null for cross-platform campaigns
    name: varchar("name").notNull(),
    description: text("description"),
    type: adCampaignType("type").default("content_promotion").notNull(),
    status: adCampaignStatus("status").default("draft").notNull(),
    budgetCents: bigint("budget_cents", { mode: "number" }).notNull(),
    dailyBudgetCents: bigint("daily_budget_cents", { mode: "number" }),
    currency: varchar("currency").default("USD").notNull(),
    targeting: jsonb("targeting").default({}), // geo, demographics, interests, tenant filters
    schedule: jsonb("schedule").default({}), // start/end dates, time restrictions
    objectives: jsonb("objectives").default({}), // campaign goals and metrics
    spentCents: bigint("spent_cents", { mode: "number" }).default(0),
    impressions: bigint("impressions", { mode: "number" }).default(0),
    clicks: bigint("clicks", { mode: "number" }).default(0),
    conversions: bigint("conversions", { mode: "number" }).default(0),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_ad_campaigns_advertiser").on(table.advertiserProfileId),
    index("idx_ad_campaigns_tenant").on(table.tenantId),
    index("idx_ad_campaigns_status").on(table.status),
    index("idx_ad_campaigns_type").on(table.type),
  ],
);

// Ad creatives
export const adCreativeKind = pgEnum("ad_creative_kind", [
  "image",
  "video",
  "carousel",
  "story",
  "native",
]);
export const adCreativeStatus = pgEnum("ad_creative_status", [
  "pending",
  "approved",
  "rejected",
  "active",
  "paused",
]);

export const adCreatives = pgTable(
  "ad_creatives",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    campaignId: varchar("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    kind: adCreativeKind("kind").notNull(),
    assetUrl: varchar("asset_url"), // media asset URL
    thumbnailUrl: varchar("thumbnail_url"),
    title: varchar("title"),
    description: text("description"),
    callToAction: varchar("call_to_action"), // "Subscribe", "View Profile", etc.
    clickUrl: text("click_url").notNull(), // destination URL
    trackingPixels: jsonb("tracking_pixels").default([]), // tracking/analytics pixels
    status: adCreativeStatus("status").default("pending").notNull(),
    policyState: varchar("policy_state"), // compliance review state
    reviewNotes: text("review_notes"),
    metrics: jsonb("metrics").default({}), // performance metrics
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_ad_creatives_campaign").on(table.campaignId),
    index("idx_ad_creatives_status").on(table.status),
    index("idx_ad_creatives_kind").on(table.kind),
  ],
);

// Ad placements across tenants
export const adPlacementType = pgEnum("ad_placement_type", [
  "feed_top",
  "feed_inline",
  "sidebar",
  "banner",
  "story",
  "profile",
]);

export const adPlacements = pgTable(
  "ad_placements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slot: varchar("slot").notNull(), // unique slot identifier per tenant
    type: adPlacementType("type").notNull(),
    displayName: varchar("display_name").notNull(),
    description: text("description"),
    dimensions: jsonb("dimensions").default({}), // width, height, aspect ratio
    constraints: jsonb("constraints").default({}), // content type restrictions, etc.
    pricing: jsonb("pricing").default({}), // CPM, CPC rates
    isActive: boolean("is_active").default(true),
    settings: jsonb("settings").default({}), // placement-specific settings
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique().on(table.tenantId, table.slot),
    index("idx_ad_placements_tenant").on(table.tenantId),
    index("idx_ad_placements_type").on(table.type),
  ],
);

// Ad impressions and engagement tracking
export const adImpressions = pgTable(
  "ad_impressions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    creativeId: varchar("creative_id")
      .notNull()
      .references(() => adCreatives.id, { onDelete: "cascade" }),
    placementId: varchar("placement_id")
      .notNull()
      .references(() => adPlacements.id, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id")
      .notNull()
      .references(() => tenants.id),
    profileId: varchar("profile_id").references(() => profiles.id), // viewer profile (nullable for anonymous)
    requestId: varchar("request_id").notNull(), // unique request identifier
    sessionId: varchar("session_id"), // user session
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    deviceInfo: jsonb("device_info").default({}), // device/browser info
    location: jsonb("location").default({}), // geo data (if consented)
    priceMicro: integer("price_micro").notNull(), // cost in micro-currency units
    currency: varchar("currency").default("USD").notNull(),
    bidData: jsonb("bid_data").default({}), // auction/bidding metadata
    consent: jsonb("consent").default({}), // privacy consent snapshot
    viewTime: integer("view_time"), // milliseconds viewed
    clicked: boolean("clicked").default(false),
    converted: boolean("converted").default(false),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_ad_impressions_creative").on(table.creativeId),
    index("idx_ad_impressions_placement").on(table.placementId),
    index("idx_ad_impressions_tenant").on(table.tenantId),
    index("idx_ad_impressions_profile").on(table.profileId),
    index("idx_ad_impressions_timestamp").on(table.timestamp),
    index("idx_ad_impressions_clicked").on(table.clicked),
  ],
);

// Webhooks
export const webhookStatusEnum = pgEnum("webhook_status", [
  "active",
  "inactive",
]);

export const webhooks = pgTable("webhooks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: varchar("url").notNull(),
  secret: varchar("secret").notNull(),
  eventsJson: jsonb("events_json").default([]),
  status: webhookStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API keys
export const apiKeys = pgTable("api_keys", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: varchar("key_hash").notNull(),
  scopes: jsonb("scopes").default([]),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Theme settings (legacy - keeping for backward compatibility)
export const themeSettings = pgTable("theme_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  isActive: boolean("is_active").default(false),
  colors: jsonb("colors").notNull().default({
    primary: "hsl(0, 100%, 50%)",
    primaryForeground: "hsl(0, 0%, 100%)",
    secondary: "hsl(45, 80%, 60%)",
    secondaryForeground: "hsl(0, 0%, 0%)",
    background: "hsl(0, 0%, 1%)",
    foreground: "hsl(0, 0%, 100%)",
    card: "hsl(15, 15%, 4%)",
    cardForeground: "hsl(0, 0%, 100%)",
    accent: "hsl(50, 100%, 65%)",
    accentForeground: "hsl(0, 0%, 0%)",
    border: "hsl(15, 15%, 15%)",
    input: "hsl(15, 15%, 18%)",
    muted: "hsl(0, 0%, 10%)",
    mutedForeground: "hsl(0, 0%, 60%)",
    destructive: "hsl(0, 84%, 60%)",
    destructiveForeground: "hsl(0, 0%, 100%)",
  }),
  typography: jsonb("typography").notNull().default({
    fontDisplay: "Orbitron",
    fontHeading: "Rajdhani",
    fontBody: "Inter",
  }),
  effects: jsonb("effects").notNull().default({
    neonIntensity: 1,
    glowEnabled: true,
    smokyBackground: true,
    flickerEnabled: true,
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CMS Theme System (new architecture)
export const versionStatusEnum = pgEnum("version_status", [
  "draft",
  "published",
  "archived",
]);
export const pageStatusEnum = pgEnum("page_status", ["draft", "published"]);

export const cmsThemes = pgTable("cms_themes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cmsThemeVersions = pgTable("cms_theme_versions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  themeId: varchar("theme_id")
    .notNull()
    .references(() => cmsThemes.id, { onDelete: "cascade" }),
  label: varchar("label").notNull().default("v1"),
  status: versionStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cmsThemeSettings = pgTable("cms_theme_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  themeVersionId: varchar("theme_version_id")
    .notNull()
    .references(() => cmsThemeVersions.id, { onDelete: "cascade" }),
  settingsJson: jsonb("settings_json").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cmsThemeAssets = pgTable("cms_theme_assets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  themeVersionId: varchar("theme_version_id")
    .notNull()
    .references(() => cmsThemeVersions.id, { onDelete: "cascade" }),
  path: varchar("path").notNull(),
  storageKey: varchar("storage_key").notNull(),
  mimeType: varchar("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cmsPages = pgTable("cms_pages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  title: varchar("title").notNull(),
  template: varchar("template").notNull().default("page"),
  status: pageStatusEnum("status").default("draft").notNull(),
  seoJson: jsonb("seo_json").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cmsPageSections = pgTable("cms_page_sections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  pageId: varchar("page_id")
    .notNull()
    .references(() => cmsPages.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(),
  sortOrder: integer("sort_order").notNull(),
  propsJson: jsonb("props_json").notNull().default({}),
});

export const cmsMenus = pgTable("cms_menus", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  handle: varchar("handle").notNull().unique(),
  title: varchar("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cmsMenuItems: any = pgTable("cms_menu_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  menuId: varchar("menu_id")
    .notNull()
    .references(() => cmsMenus.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id"),
  title: varchar("title").notNull(),
  url: varchar("url").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const cmsPublishes = pgTable("cms_publishes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id")
    .notNull()
    .references(() => users.id),
  themeVersionId: varchar("theme_version_id")
    .notNull()
    .references(() => cmsThemeVersions.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Creator Economy Platform Tables

// Creator Profiles (extended from basic profiles)
export const creatorProfiles = pgTable("creator_profiles", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  monthlyPriceCents: integer("monthly_price_cents").notNull().default(0),
  isVerified: boolean("is_verified").default(false),
  verificationBadge: varchar("verification_badge").default("none"), // "verified", "featured", "none"
  coverImageUrl: varchar("cover_image_url"),
  socialProfiles: jsonb("social_profiles").default({}),
  welcomeMessageEnabled: boolean("welcome_message_enabled").default(false),
  welcomeMessageText: text("welcome_message_text"),
  welcomeMessagePriceCents: integer("welcome_message_price_cents").default(0),
  categories: text("categories").array().default([]),
  totalEarningsCents: integer("total_earnings_cents").default(0),
  totalSubscribers: integer("total_subscribers").default(0),
  isOnline: boolean("is_online").default(false),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Promotional Codes
export const promoCodeStatusEnum = pgEnum("promo_code_status", [
  "active",
  "expired",
  "exhausted",
  "disabled",
]);
export const promoCodeTypeEnum = pgEnum("promo_code_type", [
  "percentage",
  "fixed_amount",
  "free_trial",
]);

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id").references(() => users.id, {
      onDelete: "cascade",
    }), // null = global
    code: varchar("code").notNull().unique(),
    name: varchar("name").notNull(),
    description: text("description"),
    type: promoCodeTypeEnum("type").notNull(),
    discountPercentage: integer("discount_percentage"), // For percentage type
    discountAmountCents: integer("discount_amount_cents"), // For fixed amount type
    freeTrialDays: integer("free_trial_days"), // For free trial type
    minPurchaseCents: integer("min_purchase_cents").default(0),
    maxUsageCount: integer("max_usage_count"), // null = unlimited
    currentUsageCount: integer("current_usage_count").default(0),
    validFrom: timestamp("valid_from").defaultNow(),
    validUntil: timestamp("valid_until"),
    isActive: boolean("is_active").default(true),
    status: promoCodeStatusEnum("status").default("active").notNull(),
    applicablePlans: text("applicable_plans").array().default([]), // Plan IDs
    firstTimeOnly: boolean("first_time_only").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    codeIdx: index("idx_promo_codes_code").on(table.code),
    creatorActiveIdx: index("idx_promo_codes_creator_active").on(
      table.creatorId,
      table.isActive,
    ),
    statusIdx: index("idx_promo_codes_status").on(table.status),
  }),
);

// Promo Code Usage Tracking
export const promoCodeUsages = pgTable(
  "promo_code_usages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    promoCodeId: varchar("promo_code_id")
      .notNull()
      .references(() => promoCodes.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: varchar("subscription_id").references(
      () => subscriptions.id,
      { onDelete: "set null" },
    ),
    originalPriceCents: integer("original_price_cents").notNull(),
    discountedPriceCents: integer("discounted_price_cents").notNull(),
    savingsCents: integer("savings_cents").notNull(),
    usedAt: timestamp("used_at").defaultNow(),
  },
  (table) => ({
    promoCodeIdx: index("idx_promo_usage_code").on(table.promoCodeId),
    userIdx: index("idx_promo_usage_user").on(table.userId),
  }),
);

// Update subscriptions table to reference subscription plans
export const subscriptionsEnhanced = pgTable(
  "subscriptions_enhanced",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fanId: varchar("fan_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionPlanId: varchar("subscription_plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "cascade" }),
    promoCodeId: varchar("promo_code_id").references(() => promoCodes.id, {
      onDelete: "set null",
    }),
    stripeSubscriptionId: varchar("stripe_subscription_id"),
    status: subscriptionStatus("status").default("pending").notNull(),
    originalPriceCents: integer("original_price_cents").notNull(),
    finalPriceCents: integer("final_price_cents").notNull(), // After discounts
    discountAppliedCents: integer("discount_applied_cents").default(0),
    nextBillingDate: timestamp("next_billing_date").notNull(),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    trialEndDate: timestamp("trial_end_date"), // Free trial support
    autoRenew: boolean("auto_renew").default(true),
    cancelledAt: timestamp("cancelled_at"),
    cancelReason: text("cancel_reason"),
    renewalCount: integer("renewal_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueFanCreator: unique().on(table.fanId, table.creatorId),
    creatorStatusIdx: index("idx_subs_enh_creator_status").on(
      table.creatorId,
      table.status,
    ),
    fanStatusIdx: index("idx_subs_enh_fan_status").on(
      table.fanId,
      table.status,
    ),
    nextBillingIdx: index("idx_subs_enh_next_billing").on(
      table.nextBillingDate,
    ),
    planIdx: index("idx_subs_enh_plan").on(table.subscriptionPlanId),
  }),
);

// Posts
export const postTypeEnum = pgEnum("post_type", [
  "photo",
  "video",
  "audio",
  "text",
  "reel",
  "story",
  "live",
]);
export const postVisibilityEnum = pgEnum("post_visibility", [
  "free",
  "premium",
  "subscribers_only",
]);

export const posts = pgTable(
  "posts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: postTypeEnum("type").notNull(),
    visibility: postVisibilityEnum("visibility").default("free").notNull(),
    title: varchar("title"),
    content: text("content"),
    priceCents: integer("price_cents").default(0),
    mediaUrls: text("media_urls").array().default([]),
    thumbnailUrl: varchar("thumbnail_url"),
    hashtags: text("hashtags").array().default([]),
    isScheduled: boolean("is_scheduled").default(false),
    scheduledFor: timestamp("scheduled_for"),
    likesCount: integer("likes_count").default(0),
    commentsCount: integer("comments_count").default(0),
    viewsCount: integer("views_count").default(0),
    isProcessing: boolean("is_processing").default(false),
    processingStatus: varchar("processing_status").default("pending"),
    expiresAt: timestamp("expires_at"), // For stories
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Critical indexes for feed queries and performance
    creatorCreatedAtIdx: index("idx_posts_creator_created_at").on(
      table.creatorId,
      table.createdAt.desc(),
    ),
    visibilityIdx: index("idx_posts_visibility").on(table.visibility),
    scheduledForIdx: index("idx_posts_scheduled_for").on(table.scheduledFor),
  }),
);

// Post Media (for multiple files per post)
export const postMedia = pgTable("post_media", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  postId: varchar("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  mediaAssetId: varchar("media_asset_id")
    .notNull()
    .references(() => mediaAssets.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments
export const comments = pgTable(
  "comments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    postId: varchar("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    parentId: varchar("parent_id"), // For nested comments - will reference comments.id
    likesCount: integer("likes_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Indexes for comment queries
    postIdCreatedAtIdx: index("idx_comments_post_created_at").on(
      table.postId,
      table.createdAt,
    ),
    userIdIdx: index("idx_comments_user_id").on(table.userId),
  }),
);

// Likes
export const likes = pgTable(
  "likes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: varchar("post_id").references(() => posts.id, {
      onDelete: "cascade",
    }),
    commentId: varchar("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Unique constraints to prevent duplicate likes
    uniqueUserPost: unique().on(table.userId, table.postId),
    uniqueUserComment: unique().on(table.userId, table.commentId),
    // Check constraint to ensure exactly one of postId or commentId is set
    checkExactlyOneTarget: check(
      "chk_like_exactly_one",
      sql`(post_id IS NOT NULL)::int + (comment_id IS NOT NULL)::int = 1`,
    ),
    // Performance indexes for likes queries
    postIdIdx: index("idx_likes_post_id").on(table.postId),
    commentIdIdx: index("idx_likes_comment_id").on(table.commentId),
  }),
);

// ===== DEEPFAKE DETECTION SYSTEM =====

// Verification status enum
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "suspicious",
  "deepfake",
  "rejected",
]);

// Deepfake report status
export const deepfakeReportStatusEnum = pgEnum("deepfake_report_status", [
  "reported",
  "under_review",
  "confirmed",
  "false_positive",
  "resolved",
]);

// Verified Content - Creator's authentic content fingerprints
export const verifiedContent = pgTable(
  "verified_content",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaUrl: varchar("media_url").notNull(),
    mediaType: varchar("media_type").notNull(), // image, video, audio
    contentHash: varchar("content_hash").notNull().unique(), // SHA-256 hash
    perceptualHash: varchar("perceptual_hash"), // pHash for visual similarity
    aiFingerprint: jsonb("ai_fingerprint"), // AI-generated fingerprint features
    metadata: jsonb("metadata").default({}), // resolution, duration, codec, etc.
    verifiedAt: timestamp("verified_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    creatorIdIdx: index("idx_verified_content_creator").on(table.creatorId),
    contentHashIdx: index("idx_verified_content_hash").on(table.contentHash),
  }),
);

// Content Verification - AI analysis results
export const contentVerification = pgTable(
  "content_verification",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentUrl: varchar("content_url").notNull(),
    contentType: varchar("content_type").notNull(),
    creatorId: varchar("creator_id").references(() => users.id),
    status: verificationStatusEnum("status").default("pending").notNull(),
    confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }), // 0.00 to 100.00
    aiAnalysis: jsonb("ai_analysis").default({}), // OpenAI vision analysis results
    matchedVerifiedContentId: varchar("matched_verified_content_id").references(() => verifiedContent.id),
    similarityScore: decimal("similarity_score", { precision: 5, scale: 2 }), // 0.00 to 100.00
    detectionMethod: varchar("detection_method"), // ai_vision, perceptual_hash, content_hash
    flags: jsonb("flags").default([]), // specific deepfake indicators
    reviewedBy: varchar("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    contentUrlIdx: index("idx_verification_content_url").on(table.contentUrl),
    statusIdx: index("idx_verification_status").on(table.status),
    creatorIdIdx: index("idx_verification_creator").on(table.creatorId),
  }),
);

// Deepfake Reports - User-reported and system-detected deepfakes
export const deepfakeReports = pgTable(
  "deepfake_reports",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reportedContentUrl: varchar("reported_content_url").notNull(),
    reportedContentType: varchar("reported_content_type").notNull(),
    impersonatedCreatorId: varchar("impersonated_creator_id")
      .notNull()
      .references(() => users.id),
    reportedBy: varchar("reported_by").references(() => users.id), // null if system-detected
    reportSource: varchar("report_source").notNull(), // user, system, ai_detection
    status: deepfakeReportStatusEnum("status").default("reported").notNull(),
    verificationId: varchar("verification_id").references(() => contentVerification.id),
    description: text("description"),
    evidence: jsonb("evidence").default({}), // screenshots, URLs, analysis
    actionTaken: varchar("action_taken"), // content_removed, user_warned, dmca_filed
    assignedTo: varchar("assigned_to").references(() => users.id),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    impersonatedCreatorIdx: index("idx_deepfake_reports_creator").on(table.impersonatedCreatorId),
    statusIdx: index("idx_deepfake_reports_status").on(table.status),
    reportSourceIdx: index("idx_deepfake_reports_source").on(table.reportSource),
  }),
);

// Messages
export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "photo",
  "video",
  "audio",
  "tip",
  "welcome",
]);

export const messages = pgTable(
  "messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: varchar("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: messageTypeEnum("type").default("text").notNull(),
    content: text("content"),
    mediaUrl: varchar("media_url"),
    priceCents: integer("price_cents").default(0),
    isPaid: boolean("is_paid").default(false),
    isMassMessage: boolean("is_mass_message").default(false),
    readAt: timestamp("read_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Critical indexes for inbox and conversation queries
    receiverCreatedAtIdx: index("idx_messages_receiver_created_at").on(
      table.receiverId,
      table.createdAt.desc(),
    ),
    senderCreatedAtIdx: index("idx_messages_sender_created_at").on(
      table.senderId,
      table.createdAt.desc(),
    ),
    senderReceiverIdx: index("idx_messages_sender_receiver").on(
      table.senderId,
      table.receiverId,
    ),
    readAtIdx: index("idx_messages_read_at").on(table.readAt),
  }),
);

// Tips/Transactions
export const transactionTypeEnum = pgEnum("transaction_type", [
  "subscription",
  "tip",
  "post_purchase",
  "message_purchase",
  "welcome_message",
  "live_stream",
]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const transactions = pgTable(
  "transactions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fromUserId: varchar("from_user_id")
      .notNull()
      .references(() => users.id),
    toUserId: varchar("to_user_id")
      .notNull()
      .references(() => users.id),
    type: transactionTypeEnum("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").default(0),
    creatorEarningsCents: integer("creator_earnings_cents").notNull(),
    stripePaymentIntentId: varchar("stripe_payment_intent_id"),
    status: transactionStatusEnum("status").default("pending").notNull(),
    referenceId: varchar("reference_id"), // ID of related post, message, etc.
    referenceType: varchar("reference_type"), // "post", "message", "subscription"
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Critical indexes for payouts, analytics, and earnings queries
    toUserCreatedAtIdx: index("idx_tx_to_created_at").on(
      table.toUserId,
      table.createdAt.desc(),
    ),
    fromUserCreatedAtIdx: index("idx_tx_from_created_at").on(
      table.fromUserId,
      table.createdAt.desc(),
    ),
    statusIdx: index("idx_tx_status").on(table.status),
    typeIdx: index("idx_tx_type").on(table.type),
    toUserStatusIdx: index("idx_tx_to_status").on(table.toUserId, table.status),
  }),
);

// Categories
export const categories = pgTable("categories", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Live Streams
export const streamStatusEnum = pgEnum("stream_status", [
  "scheduled",
  "live",
  "ended",
  "cancelled",
]);
export const streamTypeEnum = pgEnum("stream_type", [
  "public",
  "private",
  "subscribers_only",
]);

export const liveStreams = pgTable("live_streams", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  type: streamTypeEnum("type").default("public").notNull(),
  status: streamStatusEnum("status").default("scheduled").notNull(),
  priceCents: integer("price_cents").default(0),
  streamKey: varchar("stream_key"),
  streamUrl: varchar("stream_url"),
  thumbnailUrl: varchar("thumbnail_url"),
  // GetStream integration fields
  getstreamCallId: varchar("getstream_call_id"),
  recordingUrl: varchar("recording_url"),
  playbackUrl: varchar("playback_url"),
  hlsPlaylistUrl: varchar("hls_playlist_url"),
  rtmpIngestUrl: varchar("rtmp_ingest_url"),
  viewersCount: integer("viewers_count").default(0),
  maxViewers: integer("max_viewers").default(0),
  totalTipsCents: integer("total_tips_cents").default(0),
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stream Viewers
export const streamViewers = pgTable("stream_viewers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id")
    .notNull()
    .references(() => liveStreams.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
});

// ===== HOLOGRAPHIC STREAMING (WebXR/VR/AR) =====

// Holographic stream mode enum
export const holographicModeEnum = pgEnum("holographic_mode", [
  "vr",           // Full VR headset
  "ar",           // AR overlay
  "mixed",        // Mixed reality
  "360",          // 360-degree video
  "spatial",      // Spatial audio only
]);

// Holographic render quality
export const holographicQualityEnum = pgEnum("holographic_quality", [
  "low",          // Mobile/low-power devices
  "medium",       // Standard VR
  "high",         // High-end VR
  "ultra",        // Professional/PC VR
]);

// Holographic Streams - WebXR-enabled live streams
export const holographicStreams = pgTable(
  "holographic_streams",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    liveStreamId: varchar("live_stream_id")
      .notNull()
      .unique()
      .references(() => liveStreams.id, { onDelete: "cascade" }),
    mode: holographicModeEnum("mode").default("vr").notNull(),
    quality: holographicQualityEnum("quality").default("medium").notNull(),
    
    // WebXR session details
    webxrSessionId: varchar("webxr_session_id"),
    spatialAudioEnabled: boolean("spatial_audio_enabled").default(true),
    handTrackingEnabled: boolean("hand_tracking_enabled").default(false),
    eyeTrackingEnabled: boolean("eye_tracking_enabled").default(false),
    
    // Virtual environment
    environmentPreset: varchar("environment_preset").default("studio"), // studio, stage, nature, space, custom
    customEnvironmentUrl: varchar("custom_environment_url"),
    lightingPreset: varchar("lighting_preset").default("balanced"),
    
    // Performance settings
    maxConcurrentViewers: integer("max_concurrent_viewers").default(50),
    minFrameRate: integer("min_frame_rate").default(60),
    adaptiveQuality: boolean("adaptive_quality").default(true),
    
    // Holographic features
    avatarInteractionEnabled: boolean("avatar_interaction_enabled").default(true),
    gestureControlsEnabled: boolean("gesture_controls_enabled").default(true),
    voiceCommandsEnabled: boolean("voice_commands_enabled").default(false),
    
    metadata: jsonb("metadata").default({}), // custom WebXR settings
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    liveStreamIdx: index("idx_holographic_live_stream").on(table.liveStreamId),
    modeIdx: index("idx_holographic_mode").on(table.mode),
  }),
);

// Holographic Sessions - Active VR/AR viewer sessions
export const holographicSessions = pgTable(
  "holographic_sessions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    holographicStreamId: varchar("holographic_stream_id")
      .notNull()
      .references(() => holographicStreams.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Device & browser info
    deviceType: varchar("device_type"), // oculus_quest, vive, hololens, etc.
    browserAgent: varchar("browser_agent"),
    webxrMode: varchar("webxr_mode"), // immersive-vr, immersive-ar, inline
    
    // Session state
    isActive: boolean("is_active").default(true),
    renderQuality: holographicQualityEnum("render_quality").default("medium"),
    currentFrameRate: integer("current_frame_rate"),
    latencyMs: integer("latency_ms"),
    
    // Spatial positioning
    avatarPosition: jsonb("avatar_position"), // {x, y, z}
    avatarRotation: jsonb("avatar_rotation"), // {x, y, z, w} quaternion
    viewDirection: jsonb("view_direction"), // {x, y, z}
    
    // Interaction state
    handsTracked: boolean("hands_tracked").default(false),
    eyeGazeTracked: boolean("eye_gaze_tracked").default(false),
    gestureData: jsonb("gesture_data").default({}),
    
    joinedAt: timestamp("joined_at").defaultNow(),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    leftAt: timestamp("left_at"),
  },
  (table) => ({
    streamUserIdx: index("idx_holographic_sessions_stream_user").on(
      table.holographicStreamId,
      table.userId,
    ),
    activeSessionsIdx: index("idx_holographic_active_sessions").on(
      table.holographicStreamId,
      table.isActive,
    ),
  }),
);

// Holographic Avatars - 3D avatar customization
export const holographicAvatars = pgTable(
  "holographic_avatars",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Avatar model
    modelType: varchar("model_type").default("humanoid"), // humanoid, cartoon, abstract
    modelUrl: varchar("model_url"), // 3D model URL (glTF/GLB)
    textureUrl: varchar("texture_url"),
    
    // Customization
    bodyPreset: varchar("body_preset"),
    facePreset: varchar("face_preset"),
    colorScheme: jsonb("color_scheme").default({}), // primary, secondary, accent colors
    accessories: jsonb("accessories").default([]), // hats, glasses, clothing
    
    // Animation settings
    idleAnimation: varchar("idle_animation").default("standing"),
    gestureAnimations: jsonb("gesture_animations").default({}),
    emotionAnimations: jsonb("emotion_animations").default({}),
    
    // Voice avatar (for spatial audio)
    voiceProfileUrl: varchar("voice_profile_url"),
    spatialAudioSettings: jsonb("spatial_audio_settings").default({}),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_holographic_avatars_user").on(table.userId),
  }),
);

// Lovense Device Integration
export const lovenseDeviceStatusEnum = pgEnum("lovense_device_status", [
  "connected",
  "disconnected",
  "error",
]);
export const lovenseActionTypeEnum = pgEnum("lovense_action_type", [
  "tip",
  "manual",
  "pattern",
  "remote_control",
]);

export const lovenseDevices = pgTable(
  "lovense_devices",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id").notNull(), // Lovense device ID
    deviceName: varchar("device_name").notNull(),
    deviceType: varchar("device_type").notNull(), // "lush", "domi", "nora", etc.
    status: lovenseDeviceStatusEnum("status").default("disconnected").notNull(),
    isEnabled: boolean("is_enabled").default(true),
    batteryLevel: integer("battery_level"),
    lastConnected: timestamp("last_connected"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    creatorDeviceIdx: index("idx_lovense_creator_device").on(
      table.creatorId,
      table.deviceId,
    ),
  }),
);

export const lovenseDeviceActions = pgTable(
  "lovense_device_actions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    deviceId: varchar("device_id")
      .notNull()
      .references(() => lovenseDevices.id, { onDelete: "cascade" }),
    streamId: varchar("stream_id").references(() => liveStreams.id, {
      onDelete: "cascade",
    }),
    triggeredByUserId: varchar("triggered_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    actionType: lovenseActionTypeEnum("action_type").notNull(),
    intensity: integer("intensity"), // 0-20 for Lovense devices
    duration: integer("duration"), // Duration in seconds
    pattern: varchar("pattern"), // Pattern name or custom pattern
    tipAmount: integer("tip_amount_cents"), // Tip amount that triggered this action
    metadata: jsonb("metadata").default({}), // Additional data like custom patterns, messages
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    deviceCreatedIdx: index("idx_lovense_actions_device_created").on(
      table.deviceId,
      table.createdAt.desc(),
    ),
    streamCreatedIdx: index("idx_lovense_actions_stream_created").on(
      table.streamId,
      table.createdAt.desc(),
    ),
  }),
);

export const lovenseIntegrationSettings = pgTable(
  "lovense_integration_settings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    isEnabled: boolean("is_enabled").default(false),
    connectAppToken: varchar("connect_app_token"), // Lovense Connect app token
    domainKey: varchar("domain_key"), // Platform domain key for Lovense API
    tipMinimum: integer("tip_minimum_cents").default(100), // Minimum tip to trigger device (in cents)
    tipMaximum: integer("tip_maximum_cents").default(10000), // Maximum tip for max intensity
    intensityMapping: jsonb("intensity_mapping").default({}), // Custom tip-to-intensity mapping
    allowRemoteControl: boolean("allow_remote_control").default(false),
    allowPatterns: boolean("allow_patterns").default(true),
    customPatterns: jsonb("custom_patterns").default({}), // User-defined patterns
    lastSync: timestamp("last_sync"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

// Enhanced Lovense OAuth Integration
export const lovenseAccounts = pgTable(
  "lovense_accounts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authType: varchar("auth_type").notNull().default("qr_code"), // "qr_code", "oauth", "manual"
    accessToken: text("access_token"), // Encrypted OAuth token
    refreshToken: text("refresh_token"), // Encrypted refresh token
    tokenExpiry: timestamp("token_expiry"),
    qrCodeData: jsonb("qr_code_data").default({}), // QR code connection data
    connectionStatus: varchar("connection_status")
      .default("disconnected")
      .notNull(), // "connected", "disconnected", "error"
    lastConnectedAt: timestamp("last_connected_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: unique("idx_lovense_accounts_user").on(table.userId),
  }),
);

// Lovense Pattern Mappings
export const lovenseMappings = pgTable(
  "lovense_mappings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: varchar("event_type").notNull(), // "tip", "follow", "subscription", "custom"
    triggerValue: integer("trigger_value"), // Tip amount, etc.
    pattern: varchar("pattern").notNull(), // "vibrate", "rotate", "custom_pattern_name"
    intensity: integer("intensity").notNull().default(5), // 1-20
    duration: integer("duration").notNull().default(3), // seconds
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userEventIdx: index("idx_lovense_mappings_user_event").on(
      table.userId,
      table.eventType,
    ),
  }),
);

// Lovense WebSocket Sessions
export const lovenseSessions = pgTable(
  "lovense_sessions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id").notNull().unique(), // WebSocket session identifier
    streamId: varchar("stream_id").references(() => liveStreams.id, {
      onDelete: "cascade",
    }),
    connectionStatus: varchar("connection_status")
      .default("connecting")
      .notNull(), // "connecting", "connected", "disconnected", "error"
    clientInfo: jsonb("client_info").default({}), // Browser/device info
    lastPingAt: timestamp("last_ping_at"),
    connectedAt: timestamp("connected_at"),
    disconnectedAt: timestamp("disconnected_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userSessionIdx: index("idx_lovense_sessions_user_session").on(
      table.userId,
      table.sessionId,
    ),
    streamSessionIdx: index("idx_lovense_sessions_stream").on(
      table.streamId,
      table.connectedAt.desc(),
    ),
    statusIdx: index("idx_lovense_sessions_status").on(table.connectionStatus),
  }),
);

// Co-star Verification System
export const costarVerificationStatusEnum = pgEnum(
  "costar_verification_status",
  ["pending", "approved", "rejected", "expired"],
);

export const costarVerifications = pgTable(
  "costar_verifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    mediaId: varchar("media_id").references(() => mediaAssets.id, {
      onDelete: "cascade",
    }),
    liveStreamId: varchar("live_stream_id").references(() => liveStreams.id, {
      onDelete: "cascade",
    }),
    primaryCreatorId: varchar("primary_creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    coStarUserId: varchar("co_star_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    coStarEmail: varchar("co_star_email"), // If co-star doesn't have account yet
    status: costarVerificationStatusEnum("status").default("pending").notNull(),
    inviteToken: varchar("invite_token").unique(),
    consentDocument2257Id: varchar("consent_document_2257_id").references(
      () => records2257.id,
      { onDelete: "set null" },
    ),
    signedAt: timestamp("signed_at"),
    kycVerificationId: varchar("kyc_verification_id").references(
      () => identityVerifications.id,
      { onDelete: "set null" },
    ),
    notes: text("notes"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    mediaCreatorIdx: index("idx_costar_media_creator").on(
      table.mediaId,
      table.primaryCreatorId,
    ),
    streamCreatorIdx: index("idx_costar_stream_creator").on(
      table.liveStreamId,
      table.primaryCreatorId,
    ),
    statusIdx: index("idx_costar_status").on(table.status),
    inviteTokenIdx: index("idx_costar_invite_token").on(table.inviteToken),
  }),
);

// Media to 2257 Record Links
export const media2257Links = pgTable(
  "media_2257_links",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    mediaId: varchar("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    record2257Id: varchar("record_2257_id")
      .notNull()
      .references(() => records2257.id, { onDelete: "cascade" }),
    role: varchar("role").notNull().default("primary"), // "primary", "co_star"
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    mediaRecordIdx: unique("idx_media_2257_media_record").on(
      table.mediaId,
      table.record2257Id,
    ),
    mediaUserRoleIdx: index("idx_media_2257_media_user_role").on(
      table.mediaId,
      table.userId,
      table.role,
    ),
  }),
);

// Custodian of Records (2257 Compliance)
export const custodianOfRecords = pgTable(
  "custodian_of_records",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    title: varchar("title").notNull(),
    businessName: varchar("business_name").notNull(),
    address: text("address").notNull(),
    phone: varchar("phone").notNull(),
    email: varchar("email").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    activeIdx: index("idx_custodian_active").on(table.isActive),
  }),
);

// Reports
export const reportTypeEnum = pgEnum("report_type", [
  "spam",
  "harassment",
  "inappropriate_content",
  "copyright",
  "fake_account",
  "other",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
]);

export const reports = pgTable("reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id")
    .notNull()
    .references(() => users.id),
  reportedUserId: varchar("reported_user_id").references(() => users.id),
  reportedPostId: varchar("reported_post_id").references(() => posts.id),
  type: reportTypeEnum("type").notNull(),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").default("pending").notNull(),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  reviewNotes: text("review_notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notificationKindEnum = pgEnum("notification_kind", [
  "payout",
  "moderation",
  "kyc",
  "system",
  "fan_activity",
  "dmca",
]);

export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: notificationKindEnum("kind").notNull(),
  type: varchar("type"), // tip, subscription, message, content, stream, moderation
  title: varchar("title"),
  message: text("message"),
  payloadJson: jsonb("payload_json").default({}),
  readAt: timestamp("read_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  kycVerifications: many(identityVerifications),
  records2257: many(records2257),
  mediaAssets: many(mediaAssets),
  payoutAccounts: many(payoutAccounts),
  payouts: many(payouts),
  webhooks: many(webhooks),
  apiKeys: many(apiKeys),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  socialAccounts: many(socialAccounts),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  account: one(accounts, {
    fields: [profiles.accountId],
    references: [accounts.id],
  }),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ one }) => ({
  user: one(users, {
    fields: [socialAccounts.userId],
    references: [users.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one, many }) => ({
  owner: one(users, {
    fields: [mediaAssets.ownerId],
    references: [users.id],
  }),
  moderationQueue: many(moderationQueue),
}));

export const moderationQueueRelations = relations(
  moderationQueue,
  ({ one }) => ({
    media: one(mediaAssets, {
      fields: [moderationQueue.mediaId],
      references: [mediaAssets.id],
    }),
    reviewer: one(users, {
      fields: [moderationQueue.reviewerId],
      references: [users.id],
    }),
  }),
);

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  authProvider: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerUserSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["fan", "creator", "admin"]).default("fan"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// Social accounts schemas
export const insertSocialAccountSchema = createInsertSchema(
  socialAccounts,
).pick({
  userId: true,
  provider: true,
  providerId: true,
  email: true,
  displayName: true,
  profileUrl: true,
  profileImageUrl: true,
  accessToken: true,
  refreshToken: true,
  expiresAt: true,
});

export const socialLoginSchema = z.object({
  provider: z.enum(["google", "facebook", "twitter", "discord", "github"]),
  code: z.string().optional(), // OAuth authorization code
  state: z.string().optional(), // CSRF state parameter
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
  displayName: true,
  bio: true,
  avatarUrl: true,
  publicFlags: true,
});

export const insertMediaAssetSchema = createInsertSchema(mediaAssets).pick({
  title: true,
  description: true,
  s3Key: true,
  mimeType: true,
  size: true,
  checksum: true,
});

export const insertPayoutRequestSchema = createInsertSchema(payouts).pick({
  amountCents: true,
  currency: true,
});

export const insertWebhookSchema = createInsertSchema(webhooks).pick({
  url: true,
  eventsJson: true,
});

export const insertThemeSettingsSchema = createInsertSchema(themeSettings).pick(
  {
    name: true,
    colors: true,
    typography: true,
    effects: true,
  },
);

export const updateThemeSettingsSchema = createInsertSchema(themeSettings).pick(
  {
    name: true,
    isActive: true,
    colors: true,
    typography: true,
    effects: true,
  },
);

// CMS schemas
export const insertCmsThemeSchema = createInsertSchema(cmsThemes).pick({
  name: true,
});

export const insertCmsThemeVersionSchema = createInsertSchema(
  cmsThemeVersions,
).pick({
  label: true,
});

export const insertCmsThemeSettingsSchema = createInsertSchema(
  cmsThemeSettings,
).pick({
  settingsJson: true,
});

export const insertCmsThemeAssetSchema = createInsertSchema(
  cmsThemeAssets,
).pick({
  path: true,
  storageKey: true,
  mimeType: true,
  sizeBytes: true,
});

export const insertCmsPageSchema = createInsertSchema(cmsPages).pick({
  slug: true,
  title: true,
  template: true,
  status: true,
  seoJson: true,
});

export const insertCmsPageSectionSchema = createInsertSchema(
  cmsPageSections,
).pick({
  type: true,
  sortOrder: true,
  propsJson: true,
});

export const insertCmsMenuSchema = createInsertSchema(cmsMenus).pick({
  handle: true,
  title: true,
});

export const insertCmsMenuItemSchema = createInsertSchema(cmsMenuItems).pick({
  title: true,
  url: true,
  sortOrder: true,
});

// Creator Economy Schemas
export const insertCreatorProfileSchema = createInsertSchema(
  creatorProfiles,
).pick({
  monthlyPriceCents: true,
  coverImageUrl: true,
  socialProfiles: true,
  welcomeMessageEnabled: true,
  welcomeMessageText: true,
  welcomeMessagePriceCents: true,
  categories: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  fanId: true,
  creatorId: true,
  stripeSubscriptionId: true,
  status: true,
  monthlyPriceCents: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  creatorId: true,
  likesCount: true,
  commentsCount: true,
  viewsCount: true,
  isProcessing: true,
  processingStatus: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  postId: true,
  content: true,
  parentId: true,
});

export const insertLikeSchema = createInsertSchema(likes)
  .pick({
    postId: true,
    commentId: true,
  })
  .superRefine((data, ctx) => {
    const hasPostId = !!data.postId;
    const hasCommentId = !!data.commentId;

    if (!hasPostId && !hasCommentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either postId or commentId is required",
        path: ["postId"],
      });
    }

    if (hasPostId && hasCommentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot like both a post and comment simultaneously",
        path: ["postId"],
      });
    }
  });

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  senderId: true,
  readAt: true,
  isPaid: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  fromUserId: true,
  toUserId: true,
  platformFeeCents: true,
  creatorEarningsCents: true,
  status: true,
  stripePaymentIntentId: true,
  createdAt: true,
});

// Earnings API validation schemas
export const subscriptionPaymentSchema = z.object({
  creatorUserId: z.string().uuid("Invalid creator ID format"),
  amount: z
    .number()
    .int()
    .min(1, "Amount must be at least 1 cent")
    .max(100000000, "Amount too large"),
});

export const ppvPurchaseSchema = z.object({
  creatorUserId: z.string().uuid("Invalid creator ID format"),
  mediaId: z.string().uuid("Invalid media ID format"),
  amount: z
    .number()
    .int()
    .min(1, "Amount must be at least 1 cent")
    .max(100000000, "Amount too large"),
});

export const tipSchema = z.object({
  creatorUserId: z.string().uuid("Invalid creator ID format"),
  amount: z
    .number()
    .int()
    .min(1, "Amount must be at least 1 cent")
    .max(100000000, "Amount too large"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(500, "Message too long")
    .optional(),
});

export const liveStreamTokensSchema = z.object({
  creatorUserId: z.string().uuid("Invalid creator ID format"),
  tokenCount: z
    .number()
    .int()
    .min(1, "Token count must be at least 1")
    .max(10000, "Too many tokens"),
  tokenValue: z
    .number()
    .int()
    .min(1, "Token value must be at least 1 cent")
    .max(10000, "Token value too high"),
});

// Lovense Integration Schemas
export const insertLovenseDeviceSchema = createInsertSchema(
  lovenseDevices,
).pick({
  deviceId: true,
  deviceName: true,
  deviceType: true,
  isEnabled: true,
});

export const insertLovenseDeviceActionSchema = createInsertSchema(
  lovenseDeviceActions,
).pick({
  deviceId: true,
  streamId: true,
  actionType: true,
  intensity: true,
  duration: true,
  pattern: true,
  tipAmount: true,
  metadata: true,
});

export const insertLovenseIntegrationSettingsSchema = createInsertSchema(
  lovenseIntegrationSettings,
).pick({
  isEnabled: true,
  connectAppToken: true,
  domainKey: true,
  tipMinimum: true,
  tipMaximum: true,
  intensityMapping: true,
  allowRemoteControl: true,
  allowPatterns: true,
  customPatterns: true,
});

// Enhanced Lovense and Co-star Schemas
export const insertLovenseAccountSchema = createInsertSchema(
  lovenseAccounts,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLovenseMappingSchema = createInsertSchema(
  lovenseMappings,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLovenseSessionSchema = createInsertSchema(
  lovenseSessions,
).omit({
  id: true,
  createdAt: true,
});

export const insertCostarVerificationSchema = createInsertSchema(
  costarVerifications,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedia2257LinkSchema = createInsertSchema(
  media2257Links,
).omit({
  id: true,
  createdAt: true,
});

export const insertCustodianOfRecordsSchema = createInsertSchema(
  custodianOfRecords,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLovenseIntegrationSettingsSchema = createInsertSchema(
  lovenseIntegrationSettings,
).pick({
  isEnabled: true,
  connectAppToken: true,
  domainKey: true,
  tipMinimum: true,
  tipMaximum: true,
  intensityMapping: true,
  allowRemoteControl: true,
  allowPatterns: true,
  customPatterns: true,
});

// Device control schemas for API endpoints
export const lovenseDeviceControlSchema = z.object({
  action: z.enum(["vibrate", "rotate", "pump", "stop"]),
  intensity: z.number().min(0).max(20).optional(),
  duration: z.number().min(1).max(300).optional(), // Max 5 minutes
  pattern: z.string().optional(),
});

export const lovenseTestDeviceSchema = z.object({
  deviceId: z.string(),
  action: z.enum(["test_vibration", "check_battery", "ping"]),
  intensity: z.number().min(1).max(10).optional().default(5),
  duration: z.number().min(1).max(5).optional().default(2),
});

// Moderation API validation schemas
export const moderationDecisionSchema = z.object({
  notes: z.string().max(1000, "Notes too long").optional(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  sortOrder: true,
});

export const insertLiveStreamSchema = createInsertSchema(liveStreams).pick({
  title: true,
  description: true,
  type: true,
  priceCents: true,
  scheduledFor: true,
});

export const insertReportSchema = createInsertSchema(reports).pick({
  reportedUserId: true,
  reportedPostId: true,
  type: true,
  reason: true,
});

// Enhanced Subscription System Schemas
export const insertSubscriptionPlanSchema = createInsertSchema(
  subscriptionPlans,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentSubscribers: true,
});
export type InsertSubscriptionPlanType = z.infer<
  typeof insertSubscriptionPlanSchema
>;

export const updateSubscriptionPlanSchema =
  insertSubscriptionPlanSchema.partial();
export type UpdateSubscriptionPlanType = z.infer<
  typeof updateSubscriptionPlanSchema
>;

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentUsageCount: true,
});
export type InsertPromoCodeType = z.infer<typeof insertPromoCodeSchema>;

export const updatePromoCodeSchema = insertPromoCodeSchema.partial();
export type UpdatePromoCodeType = z.infer<typeof updatePromoCodeSchema>;

export const validatePromoCodeSchema = z.object({
  code: z.string().min(1),
  subscriptionPlanId: z.string().optional(),
});
export type ValidatePromoCodeType = z.infer<typeof validatePromoCodeSchema>;

export const applyPromoCodeSchema = z.object({
  code: z.string().min(1),
  subscriptionPlanId: z.string(),
});
export type ApplyPromoCodeType = z.infer<typeof applyPromoCodeSchema>;

export const createSubscriptionEnhancedSchema = createInsertSchema(
  subscriptionsEnhanced,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  renewalCount: true,
});
export type CreateSubscriptionEnhancedType = z.infer<
  typeof createSubscriptionEnhancedSchema
>;

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialLogin = z.infer<typeof socialLoginSchema>;
export type Profile = typeof profiles.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type ModerationQueueItem = typeof moderationQueue.$inferSelect;
export type PayoutRequest = typeof payouts.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type KycVerification = typeof identityVerifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ThemeSettings = typeof themeSettings.$inferSelect;
export type InsertThemeSettings = z.infer<typeof insertThemeSettingsSchema>;
export type UpdateThemeSettings = z.infer<typeof updateThemeSettingsSchema>;

// CMS Types
export type CmsTheme = typeof cmsThemes.$inferSelect;
export type CmsThemeVersion = typeof cmsThemeVersions.$inferSelect;
export type CmsThemeSettings = typeof cmsThemeSettings.$inferSelect;
export type CmsThemeAsset = typeof cmsThemeAssets.$inferSelect;
export type CmsPage = typeof cmsPages.$inferSelect;
export type CmsPageSection = typeof cmsPageSections.$inferSelect;
export type CmsMenu = typeof cmsMenus.$inferSelect;
export type CmsMenuItem = typeof cmsMenuItems.$inferSelect;
export type CmsPublish = typeof cmsPublishes.$inferSelect;
export type InsertCmsTheme = z.infer<typeof insertCmsThemeSchema>;
export type InsertCmsThemeVersion = z.infer<typeof insertCmsThemeVersionSchema>;
export type InsertCmsThemeSettings = z.infer<
  typeof insertCmsThemeSettingsSchema
>;
export type InsertCmsThemeAsset = z.infer<typeof insertCmsThemeAssetSchema>;
export type InsertCmsPage = z.infer<typeof insertCmsPageSchema>;
export type InsertCmsPageSection = z.infer<typeof insertCmsPageSectionSchema>;
export type InsertCmsMenu = z.infer<typeof insertCmsMenuSchema>;
export type InsertCmsMenuItem = z.infer<typeof insertCmsMenuItemSchema>;

// Admin delegation system
export const adminPermissionEnum = pgEnum("admin_permission", [
  "moderation_queue",
  "user_management",
  "theme_management",
  "analytics_access",
  "content_approval",
  "system_settings",
]);

export const delegatedPermissions = pgTable(
  "delegated_permissions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grantedBy: varchar("granted_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: adminPermissionEnum("permission").notNull(),
    granted: boolean("granted").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    unique("unique_user_permission").on(table.userId, table.permission),
  ],
);

export const insertDelegatedPermissionSchema = createInsertSchema(
  delegatedPermissions,
).omit({
  id: true,
  createdAt: true,
});

// Creator Economy Types
export type CreatorProfile = typeof creatorProfiles.$inferSelect;

// Enhanced Subscription System Types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;
export type PromoCodeUsage = typeof promoCodeUsages.$inferSelect;
export type InsertPromoCodeUsage = typeof promoCodeUsages.$inferInsert;
export type SubscriptionEnhanced = typeof subscriptionsEnhanced.$inferSelect;
export type InsertSubscriptionEnhanced =
  typeof subscriptionsEnhanced.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostMedia = typeof postMedia.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type LiveStream = typeof liveStreams.$inferSelect;
export type StreamViewer = typeof streamViewers.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type InsertCreatorProfile = z.infer<typeof insertCreatorProfileSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertLiveStream = z.infer<typeof insertLiveStreamSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;

// Lovense Integration Types
export type LovenseDevice = typeof lovenseDevices.$inferSelect;
export type LovenseDeviceAction = typeof lovenseDeviceActions.$inferSelect;
export type LovenseIntegrationSettings =
  typeof lovenseIntegrationSettings.$inferSelect;
export type InsertLovenseDevice = z.infer<typeof insertLovenseDeviceSchema>;
export type InsertLovenseDeviceAction = z.infer<
  typeof insertLovenseDeviceActionSchema
>;
export type InsertLovenseIntegrationSettings = z.infer<
  typeof insertLovenseIntegrationSettingsSchema
>;
export type UpdateLovenseIntegrationSettings = z.infer<
  typeof updateLovenseIntegrationSettingsSchema
>;
export type LovenseDeviceControl = z.infer<typeof lovenseDeviceControlSchema>;
export type LovenseTestDevice = z.infer<typeof lovenseTestDeviceSchema>;

// Enhanced Integration Types
export type LovenseAccount = typeof lovenseAccounts.$inferSelect;
export type LovenseMapping = typeof lovenseMappings.$inferSelect;
export type LovenseSession = typeof lovenseSessions.$inferSelect;
export type CostarVerification = typeof costarVerifications.$inferSelect;
export type Media2257Link = typeof media2257Links.$inferSelect;
export type CustodianOfRecords = typeof custodianOfRecords.$inferSelect;
export type InsertLovenseAccount = z.infer<typeof insertLovenseAccountSchema>;
export type InsertLovenseMapping = z.infer<typeof insertLovenseMappingSchema>;
export type InsertLovenseSession = z.infer<typeof insertLovenseSessionSchema>;
export type InsertCostarVerification = z.infer<
  typeof insertCostarVerificationSchema
>;
export type InsertMedia2257Link = z.infer<typeof insertMedia2257LinkSchema>;
export type InsertCustodianOfRecords = z.infer<
  typeof insertCustodianOfRecordsSchema
>;

// ===== COMMUNICATION MANAGEMENT SYSTEM =====

// Comment Moderation and Enhanced Features
export const commentStatusEnum = pgEnum("comment_status", [
  "approved",
  "pending",
  "flagged",
  "hidden",
  "deleted",
]);
export const sentimentEnum = pgEnum("sentiment", [
  "positive",
  "neutral",
  "negative",
  "toxic",
]);

export const commentModerations = pgTable(
  "comment_moderations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    commentId: varchar("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    moderatorId: varchar("moderator_id").references(() => users.id),
    status: commentStatusEnum("status").notNull(),
    reason: text("reason"),
    autoModerated: boolean("auto_moderated").default(false),
    aiConfidence: integer("ai_confidence").default(0),
    sentimentScore: sentimentEnum("sentiment_score"),
    toxicityScore: integer("toxicity_score").default(0),
    spamScore: integer("spam_score").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    commentIdIdx: index("idx_comment_mods_comment").on(table.commentId),
    statusIdx: index("idx_comment_mods_status").on(table.status),
    moderatorIdx: index("idx_comment_mods_moderator").on(table.moderatorId),
  }),
);

// Message Moderation and Privacy-Compliant Monitoring
export const messageStatusEnum = pgEnum("message_status", [
  "normal",
  "flagged",
  "hidden",
  "deleted",
]);
export const messageFlagReasonEnum = pgEnum("message_flag_reason", [
  "spam",
  "harassment",
  "inappropriate",
  "scam",
  "other",
]);

export const messageModerations = pgTable(
  "message_moderations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    messageId: varchar("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    reporterId: varchar("reporter_id").references(() => users.id),
    moderatorId: varchar("moderator_id").references(() => users.id),
    status: messageStatusEnum("status").notNull(),
    flagReason: messageFlagReasonEnum("flag_reason"),
    notes: text("notes"),
    autoFlagged: boolean("auto_flagged").default(false),
    reviewRequired: boolean("review_required").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    messageIdIdx: index("idx_msg_mods_message").on(table.messageId),
    statusIdx: index("idx_msg_mods_status").on(table.status),
    moderatorIdx: index("idx_msg_mods_moderator").on(table.moderatorId),
  }),
);

// System Announcements
export const announcementTypeEnum = pgEnum("announcement_type", [
  "system",
  "feature",
  "maintenance",
  "promotion",
  "emergency",
]);
export const announcementStatusEnum = pgEnum("announcement_status", [
  "draft",
  "scheduled",
  "active",
  "paused",
  "ended",
  "cancelled",
]);
export const targetAudienceEnum = pgEnum("target_audience", [
  "all",
  "creators",
  "fans",
  "subscribers",
  "verified",
  "custom",
]);

export const announcements = pgTable(
  "announcements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title").notNull(),
    content: text("content").notNull(),
    type: announcementTypeEnum("type").notNull(),
    status: announcementStatusEnum("status").default("draft").notNull(),
    targetAudience: targetAudienceEnum("target_audience")
      .default("all")
      .notNull(),
    customAudienceFilter: jsonb("custom_audience_filter").default({}),
    channels: text("channels").array().default(["in_app"]), // 'in_app', 'email', 'push', 'sms'
    priority: integer("priority").default(1), // 1=low, 2=medium, 3=high, 4=critical
    scheduledFor: timestamp("scheduled_for"),
    expiresAt: timestamp("expires_at"),
    imageUrl: varchar("image_url"),
    linkUrl: varchar("link_url"),
    linkText: varchar("link_text"),
    // Analytics
    impressions: integer("impressions").default(0),
    clicks: integer("clicks").default(0),
    dismissals: integer("dismissals").default(0),
    // A/B Testing
    isAbTest: boolean("is_ab_test").default(false),
    abTestGroup: varchar("ab_test_group"), // 'A', 'B', etc.
    abTestParentId: varchar("ab_test_parent_id").references(
      () => announcements.id,
    ),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_announcements_status").on(table.status),
    creatorIdx: index("idx_announcements_creator").on(table.creatorId),
    scheduledIdx: index("idx_announcements_scheduled").on(table.scheduledFor),
    typeIdx: index("idx_announcements_type").on(table.type),
  }),
);

// Announcement Delivery Tracking
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
  "bounced",
]);

export const announcementDeliveries = pgTable(
  "announcement_deliveries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    announcementId: varchar("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: varchar("channel").notNull(), // 'in_app', 'email', 'push', 'sms'
    status: deliveryStatusEnum("status").default("pending").notNull(),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),
    clickedAt: timestamp("clicked_at"),
    dismissedAt: timestamp("dismissed_at"),
    errorMessage: text("error_message"),
    externalId: varchar("external_id"), // FCM, email service, etc.
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    announcementUserIdx: index("idx_announcement_deliveries_user").on(
      table.announcementId,
      table.userId,
    ),
    statusIdx: index("idx_announcement_deliveries_status").on(table.status),
    channelIdx: index("idx_announcement_deliveries_channel").on(table.channel),
  }),
);

// Push Notification Campaigns
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
  "cancelled",
]);
export const notificationPlatformEnum = pgEnum("notification_platform", [
  "web",
  "ios",
  "android",
  "desktop",
]);

export const pushNotificationCampaigns = pgTable(
  "push_notification_campaigns",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    title: varchar("title").notNull(),
    body: text("body").notNull(),
    icon: varchar("icon"),
    image: varchar("image"),
    badgeIcon: varchar("badge_icon"),
    sound: varchar("sound").default("default"),
    clickAction: varchar("click_action"),
    deepLink: varchar("deep_link"),
    status: campaignStatusEnum("status").default("draft").notNull(),
    targetPlatforms: text("target_platforms")
      .array()
      .default(["web", "ios", "android"]),
    targetAudience: targetAudienceEnum("target_audience")
      .default("all")
      .notNull(),
    customAudienceFilter: jsonb("custom_audience_filter").default({}),
    // Scheduling
    scheduledFor: timestamp("scheduled_for"),
    timeZone: varchar("time_zone").default("UTC"),
    sendImmediately: boolean("send_immediately").default(false),
    // Analytics
    totalTargeted: integer("total_targeted").default(0),
    totalSent: integer("total_sent").default(0),
    totalDelivered: integer("total_delivered").default(0),
    totalClicked: integer("total_clicked").default(0),
    totalFailed: integer("total_failed").default(0),
    // A/B Testing
    isAbTest: boolean("is_ab_test").default(false),
    abTestGroup: varchar("ab_test_group"),
    abTestParentId: varchar("ab_test_parent_id").references(
      () => pushNotificationCampaigns.id,
    ),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_push_campaigns_status").on(table.status),
    creatorIdx: index("idx_push_campaigns_creator").on(table.creatorId),
    scheduledIdx: index("idx_push_campaigns_scheduled").on(table.scheduledFor),
  }),
);

// Push Notification Delivery Tracking
export const pushDeliveryStatusEnum = pgEnum("push_delivery_status", [
  "pending",
  "sent",
  "delivered",
  "clicked",
  "failed",
  "expired",
]);

export const pushNotificationDeliveries = pgTable(
  "push_notification_deliveries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    campaignId: varchar("campaign_id")
      .notNull()
      .references(() => pushNotificationCampaigns.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: notificationPlatformEnum("platform").notNull(),
    deviceToken: varchar("device_token"),
    status: pushDeliveryStatusEnum("status").default("pending").notNull(),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    clickedAt: timestamp("clicked_at"),
    errorMessage: text("error_message"),
    fcmMessageId: varchar("fcm_message_id"),
    apnsMessageId: varchar("apns_message_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    campaignUserIdx: index("idx_push_deliveries_campaign_user").on(
      table.campaignId,
      table.userId,
    ),
    statusIdx: index("idx_push_deliveries_status").on(table.status),
    platformIdx: index("idx_push_deliveries_platform").on(table.platform),
  }),
);

// User Communication Preferences and Consent
export const consentStatusEnum = pgEnum("consent_status", [
  "granted",
  "denied",
  "pending",
  "withdrawn",
]);

export const userCommunicationPreferences = pgTable(
  "user_communication_preferences",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Email preferences
    emailMarketing: consentStatusEnum("email_marketing")
      .default("pending")
      .notNull(),
    emailTransactional: consentStatusEnum("email_transactional")
      .default("granted")
      .notNull(),
    emailSystem: consentStatusEnum("email_system").default("granted").notNull(),
    // Push notification preferences
    pushMarketing: consentStatusEnum("push_marketing")
      .default("pending")
      .notNull(),
    pushTransactional: consentStatusEnum("push_transactional")
      .default("granted")
      .notNull(),
    pushSystem: consentStatusEnum("push_system").default("granted").notNull(),
    // SMS preferences
    smsMarketing: consentStatusEnum("sms_marketing")
      .default("denied")
      .notNull(),
    smsTransactional: consentStatusEnum("sms_transactional")
      .default("denied")
      .notNull(),
    // In-app preferences
    inAppAnnouncements: boolean("in_app_announcements").default(true),
    inAppNotifications: boolean("in_app_notifications").default(true),
    // Frequency settings
    maxDailyEmails: integer("max_daily_emails").default(5),
    maxDailyPush: integer("max_daily_push").default(10),
    maxWeeklySms: integer("max_weekly_sms").default(2),
    // Device tokens for push notifications
    webPushToken: varchar("web_push_token"),
    iosPushToken: varchar("ios_push_token"),
    androidPushToken: varchar("android_push_token"),
    desktopPushToken: varchar("desktop_push_token"),
    // Metadata
    lastUpdated: timestamp("last_updated").defaultNow(),
    consentDate: timestamp("consent_date").defaultNow(),
    ipAddress: varchar("ip_address"),
    userAgent: varchar("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_user_comm_prefs_user").on(table.userId),
  }),
);

// Communication Analytics and Reporting
export const communicationAnalytics = pgTable(
  "communication_analytics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    date: timestamp("date").notNull(),
    type: varchar("type").notNull(), // 'comments', 'messages', 'announcements', 'push_notifications'
    // Aggregate metrics
    totalSent: integer("total_sent").default(0),
    totalDelivered: integer("total_delivered").default(0),
    totalOpened: integer("total_opened").default(0),
    totalClicked: integer("total_clicked").default(0),
    totalReplied: integer("total_replied").default(0),
    totalReported: integer("total_reported").default(0),
    totalBlocked: integer("total_blocked").default(0),
    // Moderation metrics
    totalFlagged: integer("total_flagged").default(0),
    totalApproved: integer("total_approved").default(0),
    totalRejected: integer("total_rejected").default(0),
    autoModerationAccuracy: decimal("auto_moderation_accuracy", {
      precision: 5,
      scale: 2,
    }),
    // Engagement metrics
    averageEngagementRate: decimal("average_engagement_rate", {
      precision: 5,
      scale: 2,
    }),
    averageSentimentScore: decimal("average_sentiment_score", {
      precision: 5,
      scale: 2,
    }),
    toxicContentPercentage: decimal("toxic_content_percentage", {
      precision: 5,
      scale: 2,
    }),
    spamDetectionRate: decimal("spam_detection_rate", {
      precision: 5,
      scale: 2,
    }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    dateTypeIdx: index("idx_comm_analytics_date_type").on(
      table.date,
      table.type,
    ),
    typeIdx: index("idx_comm_analytics_type").on(table.type),
  }),
);

// Mass Message Templates
export const messageTemplateTypeEnum = pgEnum("message_template_type", [
  "welcome",
  "promotion",
  "announcement",
  "reminder",
  "custom",
]);

export const massMessageTemplates = pgTable(
  "mass_message_templates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    type: messageTemplateTypeEnum("type").notNull(),
    subject: varchar("subject"),
    content: text("content").notNull(),
    mediaUrl: varchar("media_url"),
    priceCents: integer("price_cents").default(0),
    targetAudience: targetAudienceEnum("target_audience")
      .default("all")
      .notNull(),
    customAudienceFilter: jsonb("custom_audience_filter").default({}),
    isActive: boolean("is_active").default(true),
    timesUsed: integer("times_used").default(0),
    averageResponseRate: decimal("average_response_rate", {
      precision: 5,
      scale: 2,
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    creatorTypeIdx: index("idx_msg_templates_creator_type").on(
      table.creatorId,
      table.type,
    ),
    activeIdx: index("idx_msg_templates_active").on(table.isActive),
  }),
);

// Zod schemas for new communication tables
export const insertCommentModerationSchema = createInsertSchema(
  commentModerations,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCommentModeration = z.infer<
  typeof insertCommentModerationSchema
>;
export type SelectCommentModeration = typeof commentModerations.$inferSelect;

export const insertMessageModerationSchema = createInsertSchema(
  messageModerations,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMessageModeration = z.infer<
  typeof insertMessageModerationSchema
>;
export type SelectMessageModeration = typeof messageModerations.$inferSelect;

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  impressions: true,
  clicks: true,
  dismissals: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type SelectAnnouncement = typeof announcements.$inferSelect;

export const insertPushNotificationCampaignSchema = createInsertSchema(
  pushNotificationCampaigns,
).omit({
  id: true,
  totalTargeted: true,
  totalSent: true,
  totalDelivered: true,
  totalClicked: true,
  totalFailed: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPushNotificationCampaign = z.infer<
  typeof insertPushNotificationCampaignSchema
>;
export type SelectPushNotificationCampaign =
  typeof pushNotificationCampaigns.$inferSelect;

export const insertUserCommunicationPreferencesSchema = createInsertSchema(
  userCommunicationPreferences,
).omit({
  id: true,
  lastUpdated: true,
  consentDate: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserCommunicationPreferences = z.infer<
  typeof insertUserCommunicationPreferencesSchema
>;
export type SelectUserCommunicationPreferences =
  typeof userCommunicationPreferences.$inferSelect;

export const insertMassMessageTemplateSchema = createInsertSchema(
  massMessageTemplates,
).omit({
  id: true,
  timesUsed: true,
  averageResponseRate: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMassMessageTemplate = z.infer<
  typeof insertMassMessageTemplateSchema
>;
export type SelectMassMessageTemplate =
  typeof massMessageTemplates.$inferSelect;

// DMCA Compliance Tables
export const dmcaStatusEnum = pgEnum("dmca_status", [
  "pending",
  "processed",
  "rejected",
  "counter_claimed",
]);
export const repeatInfringerStatusEnum = pgEnum("repeat_infringer_status", [
  "warning",
  "probation",
  "suspended",
  "terminated",
]);
export const contentHashAlgorithmEnum = pgEnum("content_hash_algorithm", [
  "md5",
  "sha256",
  "perceptual",
]);

export const dmcaRequests = pgTable("dmca_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  complaintId: varchar("complaint_id").notNull().unique(),
  complainantName: varchar("complainant_name").notNull(),
  complainantEmail: varchar("complainant_email").notNull(),
  complainantAddress: text("complainant_address").notNull(),
  copyrightOwner: varchar("copyright_owner").notNull(),
  workDescription: text("work_description").notNull(),
  infringementUrls: text("infringement_urls").array().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mediaAssetId: varchar("media_asset_id").references(() => mediaAssets.id, {
    onDelete: "set null",
  }),
  status: dmcaStatusEnum("status").default("pending").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processorId: varchar("processor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  legalHoldApplied: boolean("legal_hold_applied").default(false),
  contentHash: varchar("content_hash"),
  counterNotification: jsonb("counter_notification"),
  counterSubmittedAt: timestamp("counter_submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const repeatInfringers = pgTable("repeat_infringers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  infringementCount: integer("infringement_count").default(0),
  firstInfringement: timestamp("first_infringement").defaultNow(),
  lastInfringement: timestamp("last_infringement").defaultNow(),
  status: repeatInfringerStatusEnum("status").default("warning").notNull(),
  strikeHistory: text("strike_history").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contentHashes = pgTable(
  "content_hashes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    hash: varchar("hash").notNull(),
    algorithm: contentHashAlgorithmEnum("algorithm").notNull(),
    mediaAssetId: varchar("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    dmcaRequestId: varchar("dmca_request_id").references(
      () => dmcaRequests.id,
      { onDelete: "cascade" },
    ),
    blockedAt: timestamp("blocked_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_content_hash").on(table.hash),
    index("idx_content_hash_algorithm").on(table.algorithm),
  ],
);

// DMCA Insert/Select schemas
export const insertDmcaRequestSchema = createInsertSchema(dmcaRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertRepeatInfringerSchema = createInsertSchema(
  repeatInfringers,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContentHashSchema = createInsertSchema(contentHashes).omit({
  id: true,
  createdAt: true,
});

// NFT & WEB3 Tables
export const blockchainEnum = pgEnum("blockchain", [
  "ethereum",
  "polygon",
  "base",
  "arbitrum",
  "solana",
]);
export const nftStatusEnum = pgEnum("nft_status", [
  "minting",
  "minted",
  "transferred",
  "burned",
  "failed",
]);

export const nftAssets = pgTable("nft_assets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  mediaAssetId: varchar("media_asset_id")
    .notNull()
    .references(() => mediaAssets.id, { onDelete: "cascade" }),
  creatorId: varchar("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Original creator
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Current owner
  tokenId: varchar("token_id"),
  contractAddress: varchar("contract_address"),
  blockchain: blockchainEnum("blockchain").notNull(),
  metadataUri: text("metadata_uri"),
  ipfsHash: varchar("ipfs_hash"),
  status: nftStatusEnum("status").default("minting").notNull(),
  
  // Pricing & Royalties
  mintPriceCents: integer("mint_price_cents").default(0), // Initial sale price
  currentPriceCents: integer("current_price_cents"), // Current market price (nullable)
  royaltyPercentage: integer("royalty_percentage").default(1000), // 10% = 1000 basis points
  
  // Content Access Control
  isExclusive: boolean("is_exclusive").default(true), // NFT required to access content
  unlockableContentUrl: varchar("unlockable_content_url"), // Extra content for NFT holders
  accessDuration: integer("access_duration"), // null = lifetime, or seconds for time-limited
  
  // Blockchain & Minting
  transactionHash: varchar("transaction_hash"),
  forensicSignature: text("forensic_signature"),
  mintedBy: varchar("minted_by").default("crossmint"), // "crossmint", "nftport", "manual"
  
  // Resale tracking
  totalResales: integer("total_resales").default(0),
  totalRoyaltiesCents: integer("total_royalties_cents").default(0),
  lastSaleAt: timestamp("last_sale_at"),
  
  metadata: jsonb("metadata").default({}), // Additional NFT attributes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_nft_assets_creator").on(table.creatorId),
  index("idx_nft_assets_owner").on(table.ownerId),
  index("idx_nft_assets_media").on(table.mediaAssetId),
  index("idx_nft_assets_status").on(table.status),
]);

// NFT Sales & Transfers (track ownership history + royalties)
export const nftTransactionTypeEnum = pgEnum("nft_transaction_type", [
  "mint", // Initial creation
  "sale", // Purchase from another user
  "transfer", // Free transfer
  "burn", // Destroyed
]);

export const nftTransactions = pgTable("nft_transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  nftAssetId: varchar("nft_asset_id")
    .notNull()
    .references(() => nftAssets.id, { onDelete: "cascade" }),
  type: nftTransactionTypeEnum("type").notNull(),
  
  // Participants
  fromUserId: varchar("from_user_id").references(() => users.id, { onDelete: "set null" }),
  toUserId: varchar("to_user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Transaction Details
  priceCents: integer("price_cents").default(0), // Sale price (0 for free transfers)
  royaltyCents: integer("royalty_cents").default(0), // Royalty paid to creator
  platformFeeCents: integer("platform_fee_cents").default(0),
  
  // Blockchain
  transactionHash: varchar("transaction_hash"),
  blockchain: blockchainEnum("blockchain").notNull(),
  blockNumber: varchar("block_number"),
  gasFeeCents: integer("gas_fee_cents"),
  
  // Payment Integration (if fiat purchase)
  fanzWalletTransactionId: varchar("fanz_wallet_transaction_id"), // Link to FanzWallet payment
  
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_nft_transactions_asset").on(table.nftAssetId),
  index("idx_nft_transactions_from").on(table.fromUserId),
  index("idx_nft_transactions_to").on(table.toUserId),
  index("idx_nft_transactions_type").on(table.type),
]);

// NFT Collections (group NFTs together)
export const nftCollections = pgTable("nft_collections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  name: varchar("name").notNull(),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url"),
  
  // Collection Settings
  contractAddress: varchar("contract_address"),
  blockchain: blockchainEnum("blockchain").notNull(),
  maxSupply: integer("max_supply"), // null = unlimited
  currentSupply: integer("current_supply").default(0),
  
  // Royalty Settings (applied to all NFTs in collection)
  defaultRoyaltyPercentage: integer("default_royalty_percentage").default(1000), // 10%
  
  // Visibility & Status
  isPublic: boolean("is_public").default(true),
  isVerified: boolean("is_verified").default(false),
  
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_nft_collections_creator").on(table.creatorId),
]);

// NFT Relations
export const nftAssetsRelations = relations(nftAssets, ({ one, many }) => ({
  mediaAsset: one(mediaAssets, {
    fields: [nftAssets.mediaAssetId],
    references: [mediaAssets.id],
  }),
  creator: one(users, {
    fields: [nftAssets.creatorId],
    references: [users.id],
    relationName: "nft_creator",
  }),
  owner: one(users, {
    fields: [nftAssets.ownerId],
    references: [users.id],
    relationName: "nft_owner",
  }),
  transactions: many(nftTransactions),
}));

export const nftTransactionsRelations = relations(nftTransactions, ({ one }) => ({
  nftAsset: one(nftAssets, {
    fields: [nftTransactions.nftAssetId],
    references: [nftAssets.id],
  }),
  fromUser: one(users, {
    fields: [nftTransactions.fromUserId],
    references: [users.id],
    relationName: "nft_transaction_from",
  }),
  toUser: one(users, {
    fields: [nftTransactions.toUserId],
    references: [users.id],
    relationName: "nft_transaction_to",
  }),
}));

export const nftCollectionsRelations = relations(nftCollections, ({ one }) => ({
  creator: one(users, {
    fields: [nftCollections.creatorId],
    references: [users.id],
  }),
}));

// NFT Zod Schemas
export const insertNftAssetSchema = createInsertSchema(nftAssets).omit({
  id: true,
  tokenId: true,
  transactionHash: true,
  status: true,
  totalResales: true,
  totalRoyaltiesCents: true,
  lastSaleAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNftTransactionSchema = createInsertSchema(nftTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertNftCollectionSchema = createInsertSchema(nftCollections).omit({
  id: true,
  currentSupply: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
});

// NFT Types
export type NftAsset = typeof nftAssets.$inferSelect;
export type InsertNftAsset = z.infer<typeof insertNftAssetSchema>;
export type NftTransaction = typeof nftTransactions.$inferSelect;
export type InsertNftTransaction = z.infer<typeof insertNftTransactionSchema>;
export type NftCollection = typeof nftCollections.$inferSelect;
export type InsertNftCollection = z.infer<typeof insertNftCollectionSchema>;

// Analytics Events for Real-time Dashboards
export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "page_view",
  "media_view",
  "purchase",
  "tip",
  "subscription",
  "message",
  "like",
  "comment",
  "share",
  "upload",
  "stream_start",
  "stream_end",
  "nft_mint",
  "nft_purchase",
  "profile_view",
  "search",
]);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventType: analyticsEventTypeEnum("event_type").notNull(),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sessionId: varchar("session_id"),
    targetId: varchar("target_id"), // media_id, user_id, etc
    targetType: varchar("target_type"), // "media", "user", "post", etc
    properties: jsonb("properties").default({}),
    revenue: decimal("revenue", { precision: 10, scale: 2 }),
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    timestamp: timestamp("timestamp").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_analytics_events_timestamp").on(table.timestamp),
    index("idx_analytics_events_user_id").on(table.userId),
    index("idx_analytics_events_type").on(table.eventType),
  ],
);

// Alert Rules for Real-time Monitoring
export const alertSeverityEnum = pgEnum("alert_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);
export const alertStatusEnum = pgEnum("alert_status", [
  "active",
  "resolved",
  "suppressed",
]);

export const alertRules = pgTable("alert_rules", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  metric: varchar("metric").notNull(), // "revenue", "uploads", "errors", etc
  threshold: decimal("threshold", { precision: 15, scale: 2 }).notNull(),
  comparison: varchar("comparison").notNull(), // ">", "<", "==", ">=", "<="
  timeWindow: integer("time_window").default(300), // seconds
  severity: alertSeverityEnum("severity").default("medium").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  notificationChannels: text("notification_channels")
    .array()
    .default(["email"]),
  createdBy: varchar("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id")
    .notNull()
    .references(() => alertRules.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  status: alertStatusEnum("status").default("active").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }),
  threshold: decimal("threshold", { precision: 15, scale: 2 }),
  metadata: jsonb("metadata").default({}),
  triggeredAt: timestamp("triggered_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id, {
    onDelete: "set null",
  }),
  acknowledgedAt: timestamp("acknowledged_at"),
});

// AI Content Feed Preferences
export const feedPreferences = pgTable("feed_preferences", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  personalizedEnabled: boolean("personalized_enabled").default(true),
  aiRecommendations: boolean("ai_recommendations").default(true),
  contentTags: text("content_tags").array().default([]),
  excludedTags: text("excluded_tags").array().default([]),
  followedCreators: text("followed_creators").array().default([]),
  blockedUsers: text("blocked_users").array().default([]),
  ageVerificationStatus: boolean("age_verification_status").default(false),
  showBlurredContent: boolean("show_blurred_content").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom Dashboard Charts
export const dashboardCharts = pgTable("dashboard_charts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  chartType: varchar("chart_type").notNull(), // "line", "bar", "pie", "area", "scatter"
  vegaLiteSpec: jsonb("vega_lite_spec").notNull(), // Vega-Lite JSON specification
  dataSource: varchar("data_source").notNull(), // "analytics_events", "revenue", "custom"
  filters: jsonb("filters").default({}),
  refreshInterval: integer("refresh_interval").default(60), // seconds
  isPublic: boolean("is_public").default(false),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Age Verification Enhanced
export const ageVerificationMethodEnum = pgEnum("age_verification_method", [
  "id_document",
  "credit_card",
  "phone_verification",
  "third_party",
]);

export const ageVerifications = pgTable("age_verifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  method: ageVerificationMethodEnum("method").notNull(),
  verificationData: jsonb("verification_data").default({}),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for new tables
export const insertAnalyticsEventSchema = createInsertSchema(
  analyticsEvents,
).omit({ id: true, createdAt: true });
export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  triggeredAt: true,
});
export const insertFeedPreferencesSchema = createInsertSchema(
  feedPreferences,
).omit({ createdAt: true, updatedAt: true });
export const insertDashboardChartSchema = createInsertSchema(
  dashboardCharts,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgeVerificationSchema = createInsertSchema(
  ageVerifications,
).omit({ id: true, createdAt: true, updatedAt: true });

// Admin delegation types
export type DelegatedPermission = typeof delegatedPermissions.$inferSelect;
export type InsertDelegatedPermission = z.infer<
  typeof insertDelegatedPermissionSchema
>;

// DMCA types
export type DmcaRequest = typeof dmcaRequests.$inferSelect;
export type InsertDmcaRequest = z.infer<typeof insertDmcaRequestSchema>;
export type RepeatInfringer = typeof repeatInfringers.$inferSelect;
export type InsertRepeatInfringer = z.infer<typeof insertRepeatInfringerSchema>;
export type ContentHash = typeof contentHashes.$inferSelect;
export type InsertContentHash = z.infer<typeof insertContentHashSchema>;

// ENHANCED EARNINGS SYSTEM TABLES

// Performance Tiers System
export const performanceTierEnum = pgEnum("performance_tier", [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]);
export const bonusTypeEnum = pgEnum("bonus_type", [
  "milestone",
  "quality",
  "referral",
  "loyalty",
  "volume",
  "consistency",
]);

export const performanceTiers = pgTable(
  "performance_tiers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: performanceTierEnum("tier").default("bronze").notNull(),
    monthlyEarnings: decimal("monthly_earnings", {
      precision: 10,
      scale: 2,
    }).default("0"),
    totalVolume: decimal("total_volume", { precision: 12, scale: 2 }).default(
      "0",
    ),
    transactionCount: integer("transaction_count").default(0),
    consistencyScore: integer("consistency_score").default(0), // 0-100
    qualityScore: integer("quality_score").default(0), // 0-100
    referralCount: integer("referral_count").default(0),
    feeReduction: decimal("fee_reduction", { precision: 5, scale: 4 }).default(
      "0",
    ), // As decimal (0.025 = 2.5%)
    bonusEligible: boolean("bonus_eligible").default(true),
    nextTierEarnings: decimal("next_tier_earnings", {
      precision: 10,
      scale: 2,
    }),
    tierAchievedAt: timestamp("tier_achieved_at").defaultNow(),
    periodStart: timestamp("period_start").defaultNow(),
    periodEnd: timestamp("period_end"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_performance_tiers_user_period").on(
      table.userId,
      table.periodStart,
    ),
    index("idx_performance_tiers_tier").on(table.tier),
  ],
);

// Enhanced Transaction Records with Volume Tracking
export const enhancedTransactionTypeEnum = pgEnum("enhanced_transaction_type", [
  "subscription",
  "ppv",
  "tip",
  "live_token",
  "shop_sale",
  "nft_sale",
  "collaboration",
  "bonus",
  "referral_commission",
]);

export const enhancedTransactions = pgTable(
  "enhanced_transactions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: enhancedTransactionTypeEnum("type").notNull(),
    grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
    platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default(
      "0",
    ),
    processorFee: decimal("processor_fee", {
      precision: 10,
      scale: 2,
    }).notNull(),
    feeReduction: decimal("fee_reduction", { precision: 10, scale: 2 }).default(
      "0",
    ),
    netEarnings: decimal("net_earnings", { precision: 10, scale: 2 }).notNull(),
    bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).default(
      "0",
    ),
    taxWithholding: decimal("tax_withholding", {
      precision: 10,
      scale: 2,
    }).default("0"),
    sourceId: varchar("source_id"), // fan user ID or source identifier
    contentId: varchar("content_id"), // media ID for content-related transactions
    collaborationId: varchar("collaboration_id"), // for collaboration splits
    performanceTier: performanceTierEnum("performance_tier"),
    volumeDiscount: decimal("volume_discount", {
      precision: 5,
      scale: 4,
    }).default("0"),
    qualityMultiplier: decimal("quality_multiplier", {
      precision: 3,
      scale: 2,
    }).default("1.0"),
    metadata: jsonb("metadata").default({}),
    processedAt: timestamp("processed_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_enhanced_transactions_user_date").on(
      table.userId,
      table.createdAt,
    ),
    index("idx_enhanced_transactions_type").on(table.type),
    index("idx_enhanced_transactions_tier").on(table.performanceTier),
  ],
);

// Advanced Collaboration System
export const collaborationTypeEnum = pgEnum("collaboration_type", [
  "featured",
  "guest",
  "split",
  "crosspromo",
  "series",
  "custom",
]);
export const collaborationStatusEnum = pgEnum("collaboration_status", [
  "active",
  "expired",
  "pending",
  "cancelled",
]);

export const collaborations = pgTable("collaborations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  primaryCreatorId: varchar("primary_creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: collaborationTypeEnum("type").notNull(),
  status: collaborationStatusEnum("status").default("active").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).default(
    "0",
  ),
  crossPromoBonus: decimal("cross_promo_bonus", {
    precision: 5,
    scale: 4,
  }).default("0.1"), // 10% bonus for cross-promos
  automaticSplit: boolean("automatic_split").default(true),
  customRules: jsonb("custom_rules").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const collaborationParticipants = pgTable(
  "collaboration_participants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    collaborationId: varchar("collaboration_id")
      .notNull()
      .references(() => collaborations.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role").default("participant"), // "lead", "featured", "guest", "participant"
    sharePercentage: decimal("share_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(), // 25.50 = 25.5%
    minimumPayout: decimal("minimum_payout", {
      precision: 10,
      scale: 2,
    }).default("0"),
    bonusEligible: boolean("bonus_eligible").default(true),
    totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default(
      "0",
    ),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => [
    unique("collaboration_user_unique").on(table.collaborationId, table.userId),
  ],
);

// Performance Bonuses and Milestones
export const milestoneTypeEnum = pgEnum("milestone_type", [
  "earnings",
  "followers",
  "content",
  "engagement",
  "consistency",
  "referrals",
]);
export const bonusStatusEnum = pgEnum("bonus_status", [
  "pending",
  "awarded",
  "claimed",
  "expired",
]);

export const performanceMilestones = pgTable("performance_milestones", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  type: milestoneTypeEnum("type").notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).notNull(),
  bonusPercentage: decimal("bonus_percentage", { precision: 5, scale: 4 }),
  tierRequirement: performanceTierEnum("tier_requirement"),
  isRepeatable: boolean("is_repeatable").default(false),
  timeframe: varchar("timeframe"), // "daily", "weekly", "monthly", "yearly", "all_time"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userMilestones = pgTable(
  "user_milestones",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    milestoneId: varchar("milestone_id")
      .notNull()
      .references(() => performanceMilestones.id, { onDelete: "cascade" }),
    currentValue: decimal("current_value", { precision: 15, scale: 2 }).default(
      "0",
    ),
    targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
    progress: decimal("progress", { precision: 5, scale: 2 }).default("0"), // 0-100%
    status: bonusStatusEnum("status").default("pending").notNull(),
    bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }),
    achievedAt: timestamp("achieved_at"),
    claimedAt: timestamp("claimed_at"),
    expiresAt: timestamp("expires_at"),
    periodStart: timestamp("period_start").defaultNow(),
    periodEnd: timestamp("period_end"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_user_milestones_user_status").on(table.userId, table.status),
    index("idx_user_milestones_achievement").on(table.achievedAt),
  ],
);

// Advanced Analytics and Forecasting
export const earningsAnalytics = pgTable(
  "earnings_analytics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    period: varchar("period").notNull(), // "daily", "weekly", "monthly", "quarterly", "yearly"
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    grossRevenue: decimal("gross_revenue", { precision: 12, scale: 2 }).default(
      "0",
    ),
    netEarnings: decimal("net_earnings", { precision: 12, scale: 2 }).default(
      "0",
    ),
    platformFees: decimal("platform_fees", { precision: 10, scale: 2 }).default(
      "0",
    ),
    processorFees: decimal("processor_fees", {
      precision: 10,
      scale: 2,
    }).default("0"),
    bonusEarnings: decimal("bonus_earnings", {
      precision: 10,
      scale: 2,
    }).default("0"),
    taxWithholdings: decimal("tax_withholdings", {
      precision: 10,
      scale: 2,
    }).default("0"),
    transactionCount: integer("transaction_count").default(0),
    uniqueCustomers: integer("unique_customers").default(0),
    averageTransactionValue: decimal("average_transaction_value", {
      precision: 10,
      scale: 2,
    }).default("0"),
    topContentEarnings: jsonb("top_content_earnings").default([]),
    performanceTier: performanceTierEnum("performance_tier"),
    growthRate: decimal("growth_rate", { precision: 7, scale: 4 }), // Growth vs previous period
    projectedNextPeriod: decimal("projected_next_period", {
      precision: 12,
      scale: 2,
    }),
    trendDirection: varchar("trend_direction"), // "up", "down", "stable"
    seasonalityFactor: decimal("seasonality_factor", {
      precision: 5,
      scale: 4,
    }).default("1.0"),
    metadata: jsonb("metadata").default({}),
    calculatedAt: timestamp("calculated_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_earnings_analytics_user_period").on(
      table.userId,
      table.period,
      table.periodStart,
    ),
    unique("earnings_analytics_user_period_unique").on(
      table.userId,
      table.period,
      table.periodStart,
    ),
  ],
);

// Tax and Compliance Tracking
export const taxJurisdictionEnum = pgEnum("tax_jurisdiction", [
  "us_federal",
  "us_state",
  "uk",
  "eu",
  "canada",
  "australia",
  "other",
]);
export const taxDocumentTypeEnum = pgEnum("tax_document_type", [
  "1099_nec",
  "1099_k",
  "w9",
  "w8ben",
  "annual_summary",
  "quarterly_report",
]);

export const taxRecords = pgTable(
  "tax_records",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taxYear: integer("tax_year").notNull(),
    jurisdiction: taxJurisdictionEnum("jurisdiction").notNull(),
    grossIncome: decimal("gross_income", { precision: 12, scale: 2 }).default(
      "0",
    ),
    withheldAmount: decimal("withheld_amount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    deductibleExpenses: decimal("deductible_expenses", {
      precision: 10,
      scale: 2,
    }).default("0"),
    netTaxableIncome: decimal("net_taxable_income", {
      precision: 12,
      scale: 2,
    }).default("0"),
    estimatedTaxRate: decimal("estimated_tax_rate", {
      precision: 5,
      scale: 4,
    }).default("0"),
    documentUrls: text("document_urls").array().default([]),
    isFinalized: boolean("is_finalized").default(false),
    submittedToAuthorities: boolean("submitted_to_authorities").default(false),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_tax_records_user_year").on(table.userId, table.taxYear),
    unique("tax_records_user_year_jurisdiction_unique").on(
      table.userId,
      table.taxYear,
      table.jurisdiction,
    ),
  ],
);

// Volume-Based Fee Schedules
export const volumeTiers = pgTable(
  "volume_tiers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tierName: varchar("tier_name").notNull(),
    minimumVolume: decimal("minimum_volume", {
      precision: 12,
      scale: 2,
    }).notNull(),
    maximumVolume: decimal("maximum_volume", { precision: 12, scale: 2 }),
    feeReduction: decimal("fee_reduction", {
      precision: 5,
      scale: 4,
    }).notNull(), // 0.005 = 0.5% reduction
    bonusPercentage: decimal("bonus_percentage", {
      precision: 5,
      scale: 4,
    }).default("0"),
    isActive: boolean("is_active").default(true),
    effectiveDate: timestamp("effective_date").defaultNow(),
    expirationDate: timestamp("expiration_date"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_volume_tiers_range").on(
      table.minimumVolume,
      table.maximumVolume,
    ),
  ],
);

// Insert schemas for new earnings tables
export const insertPerformanceTierSchema = createInsertSchema(
  performanceTiers,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnhancedTransactionSchema = createInsertSchema(
  enhancedTransactions,
).omit({ id: true, createdAt: true });
export const insertCollaborationSchema = createInsertSchema(
  collaborations,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCollaborationParticipantSchema = createInsertSchema(
  collaborationParticipants,
).omit({ id: true, joinedAt: true });
export const insertPerformanceMilestoneSchema = createInsertSchema(
  performanceMilestones,
).omit({ id: true, createdAt: true });
export const insertUserMilestoneSchema = createInsertSchema(
  userMilestones,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEarningsAnalyticsSchema = createInsertSchema(
  earningsAnalytics,
).omit({ id: true, calculatedAt: true, createdAt: true });
export const insertTaxRecordSchema = createInsertSchema(taxRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertVolumeTierSchema = createInsertSchema(volumeTiers).omit({
  id: true,
  createdAt: true,
});

// New feature types
export type NftAsset = typeof nftAssets.$inferSelect;
export type InsertNftAsset = z.infer<typeof insertNftAssetSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type FeedPreferences = typeof feedPreferences.$inferSelect;
export type InsertFeedPreferences = z.infer<typeof insertFeedPreferencesSchema>;
export type DashboardChart = typeof dashboardCharts.$inferSelect;
export type InsertDashboardChart = z.infer<typeof insertDashboardChartSchema>;
export type AgeVerification = typeof ageVerifications.$inferSelect;
export type InsertAgeVerification = z.infer<typeof insertAgeVerificationSchema>;

// Enhanced Earnings System Types
export type PerformanceTier = typeof performanceTiers.$inferSelect;
export type InsertPerformanceTier = z.infer<typeof insertPerformanceTierSchema>;
export type EnhancedTransaction = typeof enhancedTransactions.$inferSelect;
export type InsertEnhancedTransaction = z.infer<
  typeof insertEnhancedTransactionSchema
>;
export type Collaboration = typeof collaborations.$inferSelect;
export type InsertCollaboration = z.infer<typeof insertCollaborationSchema>;
export type CollaborationParticipant =
  typeof collaborationParticipants.$inferSelect;
export type InsertCollaborationParticipant = z.infer<
  typeof insertCollaborationParticipantSchema
>;
export type PerformanceMilestone = typeof performanceMilestones.$inferSelect;
export type InsertPerformanceMilestone = z.infer<
  typeof insertPerformanceMilestoneSchema
>;
export type UserMilestone = typeof userMilestones.$inferSelect;
export type InsertUserMilestone = z.infer<typeof insertUserMilestoneSchema>;
export type EarningsAnalytics = typeof earningsAnalytics.$inferSelect;
export type InsertEarningsAnalytics = z.infer<
  typeof insertEarningsAnalyticsSchema
>;
export type TaxRecord = typeof taxRecords.$inferSelect;
export type InsertTaxRecord = z.infer<typeof insertTaxRecordSchema>;
export type VolumeTier = typeof volumeTiers.$inferSelect;
export type InsertVolumeTier = z.infer<typeof insertVolumeTierSchema>;

// Admin Dashboard - Complaints Management
export const complaintCategoryEnum = pgEnum("complaint_category", [
  "content",
  "user_behavior",
  "technical",
  "billing",
  "copyright",
  "harassment",
  "spam",
  "other",
]);
export const complaintPriorityEnum = pgEnum("complaint_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const complaintStatusEnum = pgEnum("complaint_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "escalated",
]);

export const complaints = pgTable(
  "complaints",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    submitterId: varchar("submitter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectUserId: varchar("subject_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    subjectContentId: varchar("subject_content_id"), // Reference to media or content
    category: complaintCategoryEnum("category").notNull(),
    priority: complaintPriorityEnum("priority").default("medium").notNull(),
    status: complaintStatusEnum("status").default("open").notNull(),
    title: varchar("title").notNull(),
    description: text("description").notNull(),
    evidenceUrls: text("evidence_urls").array().default([]),
    assignedToId: varchar("assigned_to_id").references(() => users.id, {
      onDelete: "set null",
    }),
    internalNotes: text("internal_notes"),
    resolution: text("resolution"),
    resolvedAt: timestamp("resolved_at"),
    resolvedById: varchar("resolved_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    escalatedAt: timestamp("escalated_at"),
    escalatedById: varchar("escalated_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_complaints_status_priority").on(table.status, table.priority),
    index("idx_complaints_assigned_status").on(
      table.assignedToId,
      table.status,
    ),
    index("idx_complaints_category_created").on(
      table.category,
      table.createdAt.desc(),
    ),
  ],
);

export const complaintComments = pgTable(
  "complaint_comments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    complaintId: varchar("complaint_id")
      .notNull()
      .references(() => complaints.id, { onDelete: "cascade" }),
    authorId: varchar("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isInternal: boolean("is_internal").default(true), // Internal admin comments vs public responses
    attachmentUrls: text("attachment_urls").array().default([]),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_complaint_comments_complaint").on(
      table.complaintId,
      table.createdAt,
    ),
  ],
);

// Admin Dashboard Configuration
export const dashboardWidgetTypeEnum = pgEnum("dashboard_widget_type", [
  "stat_card",
  "chart",
  "table",
  "activity_feed",
  "quick_actions",
  "alert_panel",
]);
export const chartTypeEnum = pgEnum("chart_type", [
  "line",
  "bar",
  "pie",
  "doughnut",
  "area",
  "gauge",
]);

export const adminDashboardConfigs = pgTable(
  "admin_dashboard_configs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    isDefault: boolean("is_default").default(false),
    layout: jsonb("layout").notNull(), // Grid layout configuration
    widgets: jsonb("widgets").notNull(), // Widget configurations
    refreshInterval: integer("refresh_interval").default(300), // Seconds
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_admin_dashboard_user").on(table.userId, table.isActive),
  ],
);

// Admin Report Templates
export const adminReportTypeEnum = pgEnum("admin_report_type", [
  "financial",
  "user_analytics",
  "content",
  "compliance",
  "custom",
]);
export const reportFrequencyEnum = pgEnum("report_frequency", [
  "on_demand",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);
export const reportFormatEnum = pgEnum("report_format", [
  "pdf",
  "csv",
  "excel",
  "json",
]);

export const adminReportTemplates = pgTable(
  "admin_report_templates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    description: text("description"),
    type: adminReportTypeEnum("type").notNull(),
    config: jsonb("config").notNull(), // Report parameters and filters
    frequency: reportFrequencyEnum("frequency").default("on_demand").notNull(),
    format: reportFormatEnum("format").default("pdf").notNull(),
    recipients: text("recipients").array().default([]), // Email addresses
    isActive: boolean("is_active").default(true),
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastGenerated: timestamp("last_generated"),
    nextScheduled: timestamp("next_scheduled"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_admin_reports_type_active").on(table.type, table.isActive),
    index("idx_admin_reports_next_scheduled").on(table.nextScheduled),
  ],
);

export const adminReportRuns = pgTable(
  "admin_report_runs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    templateId: varchar("template_id")
      .notNull()
      .references(() => adminReportTemplates.id, { onDelete: "cascade" }),
    status: varchar("status").default("pending").notNull(), // pending, generating, completed, failed
    parameters: jsonb("parameters").default({}),
    outputUrl: varchar("output_url"),
    fileSize: integer("file_size"),
    generatedById: varchar("generated_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_admin_report_runs_template").on(
      table.templateId,
      table.createdAt.desc(),
    ),
    index("idx_admin_report_runs_status").on(table.status),
  ],
);

// System Health and Performance Metrics
export const systemMetrics = pgTable(
  "system_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    metricName: varchar("metric_name").notNull(),
    metricValue: decimal("metric_value", { precision: 15, scale: 6 }).notNull(),
    metricUnit: varchar("metric_unit"), // percent, count, bytes, seconds, etc.
    category: varchar("category").notNull(), // database, api, storage, payment, etc.
    tags: jsonb("tags").default({}),
    collectedAt: timestamp("collected_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_system_metrics_name_time").on(
      table.metricName,
      table.collectedAt.desc(),
    ),
    index("idx_system_metrics_category").on(
      table.category,
      table.collectedAt.desc(),
    ),
  ],
);

// Insert schemas for admin tables
export const insertComplaintSchema = createInsertSchema(complaints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertComplaintCommentSchema = createInsertSchema(
  complaintComments,
).omit({ id: true, createdAt: true });
export const insertAdminDashboardConfigSchema = createInsertSchema(
  adminDashboardConfigs,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdminReportTemplateSchema = createInsertSchema(
  adminReportTemplates,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdminReportRunSchema = createInsertSchema(
  adminReportRuns,
).omit({ id: true, createdAt: true });
export const insertSystemMetricSchema = createInsertSchema(systemMetrics).omit({
  id: true,
  createdAt: true,
});

// Missing insert schemas for admin features
export const insertPayoutAccountSchema = createInsertSchema(
  payoutAccounts,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKycVerificationSchema = createInsertSchema(
  identityVerifications,
).omit({ id: true, createdAt: true, updatedAt: true });

// Admin feature types
export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type ComplaintComment = typeof complaintComments.$inferSelect;
export type InsertComplaintComment = z.infer<
  typeof insertComplaintCommentSchema
>;
export type AdminDashboardConfig = typeof adminDashboardConfigs.$inferSelect;
export type InsertAdminDashboardConfig = z.infer<
  typeof insertAdminDashboardConfigSchema
>;
export type AdminReportTemplate = typeof adminReportTemplates.$inferSelect;
export type InsertAdminReportTemplate = z.infer<
  typeof insertAdminReportTemplateSchema
>;
export type AdminReportRun = typeof adminReportRuns.$inferSelect;
export type InsertAdminReportRun = z.infer<typeof insertAdminReportRunSchema>;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = z.infer<typeof insertSystemMetricSchema>;

// Additional admin feature types
export type PayoutAccount = typeof payoutAccounts.$inferSelect;
export type InsertPayoutAccount = z.infer<typeof insertPayoutAccountSchema>;
export type KycVerification = typeof identityVerifications.$inferSelect;
export type InsertKycVerification = z.infer<typeof insertKycVerificationSchema>;

// ===== ADMIN MANAGEMENT SYSTEM EXTENSIONS =====

// ===== 1. LEADERBOARD SYSTEM =====
export const leaderboardTypeEnum = pgEnum("leaderboard_type", [
  "earnings",
  "engagement",
  "followers",
  "content",
  "tips",
  "streams",
  "posts",
]);
export const leaderboardPeriodEnum = pgEnum("leaderboard_period", [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "all_time",
]);

export const leaderboards = pgTable(
  "leaderboards",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    type: leaderboardTypeEnum("type").notNull(),
    period: leaderboardPeriodEnum("period").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true),
    isPublic: boolean("is_public").default(true),
    maxEntries: integer("max_entries").default(100),
    scoringAlgorithm: jsonb("scoring_algorithm").default({}),
    weights: jsonb("weights").default({}),
    criteria: jsonb("criteria").default({}),
    prizesEnabled: boolean("prizes_enabled").default(false),
    prizeStructure: jsonb("prize_structure").default({}),
    resetFrequency: varchar("reset_frequency").default("weekly"), // daily, weekly, monthly, never
    lastResetAt: timestamp("last_reset_at"),
    nextResetAt: timestamp("next_reset_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_leaderboards_type_period").on(table.type, table.period),
    index("idx_leaderboards_active").on(table.isActive),
  ],
);

export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    leaderboardId: varchar("leaderboard_id")
      .notNull()
      .references(() => leaderboards.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: decimal("score", { precision: 15, scale: 2 }).notNull(),
    rank: integer("rank").notNull(),
    previousRank: integer("previous_rank"),
    rankChange: integer("rank_change").default(0),
    bonus: decimal("bonus", { precision: 10, scale: 2 }).default("0"),
    badge: varchar("badge"),
    metadata: jsonb("metadata").default({}),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    lastUpdated: timestamp("last_updated").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique("unique_leaderboard_user_period").on(
      table.leaderboardId,
      table.userId,
      table.periodStart,
    ),
    index("idx_leaderboard_entries_rank").on(table.leaderboardId, table.rank),
    index("idx_leaderboard_entries_score").on(
      table.leaderboardId,
      table.score.desc(),
    ),
    index("idx_leaderboard_entries_user").on(table.userId),
  ],
);

export const leaderboardAchievements = pgTable("leaderboard_achievements", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  badgeIcon: varchar("badge_icon"),
  badgeColor: varchar("badge_color"),
  leaderboardType: leaderboardTypeEnum("leaderboard_type"),
  requirement: jsonb("requirement").notNull(), // e.g., {"type": "rank", "value": 1, "consecutive_periods": 3}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: varchar("achievement_id")
      .notNull()
      .references(() => leaderboardAchievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at").defaultNow(),
    isVisible: boolean("is_visible").default(true),
    metadata: jsonb("metadata").default({}),
  },
  (table) => [
    unique("unique_user_achievement").on(table.userId, table.achievementId),
    index("idx_user_achievements_user").on(table.userId),
  ],
);

// ===== 2. ENHANCED CONSENT FORMS SYSTEM =====
export const consentFormTypeEnum = pgEnum("consent_form_type", [
  "model_release",
  "costar_consent",
  "age_verification",
  "custom_form",
]);
export const consentFormStatusEnum = pgEnum("consent_form_status", [
  "pending",
  "signed",
  "expired",
  "withdrawn",
  "rejected",
]);

export const consentFormTemplates = pgTable("consent_form_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: consentFormTypeEnum("type").notNull(),
  version: varchar("version").default("1.0"),
  description: text("description"),
  formData: jsonb("form_data").notNull(), // Form structure and fields
  legalText: text("legal_text").notNull(),
  requirements: jsonb("requirements").default({}),
  expirationDays: integer("expiration_days").default(365),
  isActive: boolean("is_active").default(true),
  isRequired: boolean("is_required").default(false),
  jurisdiction: varchar("jurisdiction").default("US"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const consentForms = pgTable(
  "consent_forms",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    templateId: varchar("template_id")
      .notNull()
      .references(() => consentFormTemplates.id),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    costarUserId: varchar("costar_user_id").references(() => users.id, {
      onDelete: "cascade",
    }), // For co-star consents
    status: consentFormStatusEnum("status").default("pending").notNull(),
    formData: jsonb("form_data").notNull(), // Filled form data
    documentsUploaded: text("documents_uploaded").array().default([]),
    digitalSignature: text("digital_signature"),
    ipAddress: varchar("ip_address"),
    signedAt: timestamp("signed_at"),
    expiresAt: timestamp("expires_at"),
    withdrawnAt: timestamp("withdrawn_at"),
    withdrawalReason: text("withdrawal_reason"),
    reviewedBy: varchar("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    notificationsSent: jsonb("notifications_sent").default([]),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_consent_forms_user").on(table.userId),
    index("idx_consent_forms_status").on(table.status),
    index("idx_consent_forms_expires").on(table.expiresAt),
    index("idx_consent_forms_costar").on(table.costarUserId),
  ],
);

export const consentNotificationSchedule = pgTable(
  "consent_notification_schedule",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    consentFormId: varchar("consent_form_id")
      .notNull()
      .references(() => consentForms.id, { onDelete: "cascade" }),
    notificationType: varchar("notification_type").notNull(), // "expiring_soon", "expired", "renewal_reminder"
    scheduledFor: timestamp("scheduled_for").notNull(),
    sentAt: timestamp("sent_at"),
    status: varchar("status").default("pending"), // pending, sent, failed
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_consent_notifications_scheduled").on(table.scheduledFor),
    index("idx_consent_notifications_status").on(table.status),
  ],
);

// ===== 3. STORIES MANAGEMENT SYSTEM =====
export const storyStatusEnum = pgEnum("story_status", [
  "active",
  "expired",
  "archived",
  "hidden",
  "flagged",
]);
export const storyTypeEnum = pgEnum("story_type", [
  "photo",
  "video",
  "text",
  "poll",
  "question",
]);

export const stories = pgTable(
  "stories",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: storyTypeEnum("type").notNull(),
    status: storyStatusEnum("status").default("active").notNull(),
    mediaUrl: varchar("media_url"),
    thumbnailUrl: varchar("thumbnail_url"),
    text: text("text"),
    duration: integer("duration"), // For videos, in seconds
    viewsCount: integer("views_count").default(0),
    likesCount: integer("likes_count").default(0),
    repliesCount: integer("replies_count").default(0),
    isHighlighted: boolean("is_highlighted").default(false),
    isPromoted: boolean("is_promoted").default(false),
    pollData: jsonb("poll_data"), // For poll stories
    questionData: jsonb("question_data"), // For question stories
    viewerList: jsonb("viewer_list").default([]), // Array of user IDs who viewed
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_stories_creator_created").on(
      table.creatorId,
      table.createdAt.desc(),
    ),
    index("idx_stories_status_expires").on(table.status, table.expiresAt),
    index("idx_stories_promoted").on(table.isPromoted),
  ],
);

export const storyViews = pgTable(
  "story_views",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: varchar("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    viewerId: varchar("viewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at").defaultNow(),
    viewDuration: integer("view_duration"), // How long they viewed it, in seconds
  },
  (table) => [
    unique("unique_story_viewer").on(table.storyId, table.viewerId),
    index("idx_story_views_story").on(table.storyId),
    index("idx_story_views_viewer").on(table.viewerId),
  ],
);

export const storyReplies = pgTable(
  "story_replies",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storyId: varchar("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    fromUserId: varchar("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    mediaUrl: varchar("media_url"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_story_replies_story").on(table.storyId),
    index("idx_story_replies_from").on(table.fromUserId),
  ],
);

// ===== 4. SHOP MANAGEMENT SYSTEM =====
export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "inactive",
  "out_of_stock",
  "discontinued",
]);
export const productTypeEnum = pgEnum("product_type", [
  "digital",
  "physical",
  "subscription",
  "bundle",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);
export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const productCategories = pgTable(
  "product_categories",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    slug: varchar("slug").notNull().unique(),
    description: text("description"),
    imageUrl: varchar("image_url"),
    parentId: varchar("parent_id").references(() => productCategories.id),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_product_categories_parent").on(table.parentId),
    index("idx_product_categories_active").on(table.isActive),
  ],
);

export const products = pgTable(
  "products",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id").references(() => productCategories.id),
    name: varchar("name").notNull(),
    slug: varchar("slug").notNull(),
    description: text("description"),
    shortDescription: text("short_description"),
    type: productTypeEnum("type").notNull(),
    status: productStatusEnum("status").default("draft").notNull(),
    priceCents: integer("price_cents").notNull(),
    comparePriceCents: integer("compare_price_cents"), // Original price for discounts
    costCents: integer("cost_cents"), // Creator's cost
    sku: varchar("sku"),
    barcode: varchar("barcode"),
    weight: integer("weight"), // in grams
    dimensions: jsonb("dimensions"), // {length, width, height}
    images: text("images").array().default([]),
    tags: text("tags").array().default([]),
    inventory: jsonb("inventory").default({}), // {track: bool, quantity: int, policy: string}
    shippingRequired: boolean("shipping_required").default(false),
    shippingSettings: jsonb("shipping_settings").default({}),
    digitalAssets: text("digital_assets").array().default([]), // For digital products
    metadata: jsonb("metadata").default({}),
    seoTitle: varchar("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("unique_creator_product_slug").on(table.creatorId, table.slug),
    index("idx_products_creator_status").on(table.creatorId, table.status),
    index("idx_products_category").on(table.categoryId),
    index("idx_products_status").on(table.status),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: varchar("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: varchar("title").notNull(),
    option1: varchar("option1"), // e.g., "Size"
    option2: varchar("option2"), // e.g., "Color"
    option3: varchar("option3"), // e.g., "Material"
    priceCents: integer("price_cents").notNull(),
    comparePriceCents: integer("compare_price_cents"),
    costCents: integer("cost_cents"),
    sku: varchar("sku"),
    barcode: varchar("barcode"),
    inventoryQuantity: integer("inventory_quantity").default(0),
    weight: integer("weight"),
    imageUrl: varchar("image_url"),
    position: integer("position").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_product_variants_product").on(table.productId),
    index("idx_product_variants_sku").on(table.sku),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderNumber: varchar("order_number").notNull().unique(),
    customerId: varchar("customer_id")
      .notNull()
      .references(() => users.id),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id),
    status: orderStatusEnum("status").default("pending").notNull(),
    fulfillmentStatus: fulfillmentStatusEnum("fulfillment_status")
      .default("pending")
      .notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    taxCents: integer("tax_cents").default(0),
    shippingCents: integer("shipping_cents").default(0),
    discountCents: integer("discount_cents").default(0),
    totalCents: integer("total_cents").notNull(),
    currency: varchar("currency").default("USD"),
    customerEmail: varchar("customer_email").notNull(),
    shippingAddress: jsonb("shipping_address"),
    billingAddress: jsonb("billing_address"),
    paymentMethod: varchar("payment_method"),
    paymentStatus: varchar("payment_status").default("pending"),
    paymentReference: varchar("payment_reference"),
    notes: text("notes"),
    cancelReason: text("cancel_reason"),
    cancelledAt: timestamp("cancelled_at"),
    processedAt: timestamp("processed_at"),
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_orders_customer").on(table.customerId),
    index("idx_orders_creator").on(table.creatorId),
    index("idx_orders_status").on(table.status),
    index("idx_orders_number").on(table.orderNumber),
  ],
);

export const orderLineItems = pgTable(
  "order_line_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: varchar("product_id").references(() => products.id),
    variantId: varchar("variant_id").references(() => productVariants.id),
    title: varchar("title").notNull(),
    variantTitle: varchar("variant_title"),
    quantity: integer("quantity").notNull(),
    priceCents: integer("price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    sku: varchar("sku"),
    productData: jsonb("product_data"), // Snapshot of product at order time
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_order_line_items_order").on(table.orderId),
    index("idx_order_line_items_product").on(table.productId),
  ],
);

// ===== 5. COMPREHENSIVE FINANCIAL ADMIN SYSTEM =====

// Billing Information Management
export const billingCycleEnum = pgEnum("billing_cycle", [
  "weekly",
  "monthly",
  "quarterly",
  "annually",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
]);
export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "card",
  "bank_transfer",
  "crypto",
  "paypal",
  "stripe_connect",
  "wire",
]);

export const billingProfiles = pgTable(
  "billing_profiles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyName: varchar("company_name"),
    taxId: varchar("tax_id"),
    vatNumber: varchar("vat_number"),
    billingAddress: jsonb("billing_address").notNull(),
    paymentTerms: integer("payment_terms").default(30), // Days
    preferredCurrency: varchar("preferred_currency").default("USD"),
    billingCycle: billingCycleEnum("billing_cycle").default("monthly"),
    creditLimit: integer("credit_limit_cents").default(0),
    currentBalance: integer("current_balance_cents").default(0),
    autoPayEnabled: boolean("auto_pay_enabled").default(false),
    invoiceDeliveryMethod: varchar("invoice_delivery_method").default("email"),
    customFields: jsonb("custom_fields").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_billing_profiles_user").on(table.userId),
    index("idx_billing_profiles_tax_id").on(table.taxId),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    invoiceNumber: varchar("invoice_number").notNull().unique(),
    billingProfileId: varchar("billing_profile_id")
      .notNull()
      .references(() => billingProfiles.id),
    customerId: varchar("customer_id")
      .notNull()
      .references(() => users.id),
    status: invoiceStatusEnum("status").default("draft"),
    subtotalCents: integer("subtotal_cents").notNull(),
    taxCents: integer("tax_cents").default(0),
    discountCents: integer("discount_cents").default(0),
    totalCents: integer("total_cents").notNull(),
    currency: varchar("currency").default("USD"),
    dueDate: timestamp("due_date").notNull(),
    paidAt: timestamp("paid_at"),
    paymentReference: varchar("payment_reference"),
    notes: text("notes"),
    lineItems: jsonb("line_items").notNull(),
    taxBreakdown: jsonb("tax_breakdown").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_invoices_billing_profile").on(table.billingProfileId),
    index("idx_invoices_customer").on(table.customerId),
    index("idx_invoices_status").on(table.status),
    index("idx_invoices_due_date").on(table.dueDate),
  ],
);

// Tax Rates Management
export const taxTypeEnum = pgEnum("tax_type", [
  "vat",
  "sales",
  "gst",
  "income",
  "withholding",
  "digital_services",
]);
export const taxCalculationMethodEnum = pgEnum("tax_calculation_method", [
  "inclusive",
  "exclusive",
  "compound",
]);

export const taxRates = pgTable(
  "tax_rates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    code: varchar("code").notNull(),
    taxType: taxTypeEnum("tax_type").notNull(),
    rate: decimal("rate", { precision: 5, scale: 4 }).notNull(),
    jurisdiction: varchar("jurisdiction").notNull(), // Country, state, or province
    region: varchar("region"), // For more granular location targeting
    calculationMethod:
      taxCalculationMethodEnum("calculation_method").default("exclusive"),
    isActive: boolean("is_active").default(true),
    effectiveFrom: timestamp("effective_from").notNull(),
    effectiveTo: timestamp("effective_to"),
    description: text("description"),
    applicableBusinessTypes: text("applicable_business_types")
      .array()
      .default([]),
    thresholdCents: integer("threshold_cents").default(0),
    exemptions: jsonb("exemptions").default({}),
    apiIntegration: jsonb("api_integration").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_tax_rates_jurisdiction").on(table.jurisdiction),
    index("idx_tax_rates_active").on(table.isActive),
    index("idx_tax_rates_effective").on(table.effectiveFrom, table.effectiveTo),
    unique("unique_tax_rate_code").on(table.code),
  ],
);

// Payment Gateway Configurations
export const gatewayStatusEnum = pgEnum("gateway_status", [
  "active",
  "inactive",
  "testing",
  "maintenance",
]);
export const gatewayTypeEnum = pgEnum("gateway_type", [
  "stripe",
  "paypal",
  "square",
  "coinbase",
  "bitpay",
  "bank_transfer",
  "custom",
]);

export const paymentGateways = pgTable(
  "payment_gateways",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    type: gatewayTypeEnum("type").notNull(),
    status: gatewayStatusEnum("status").default("inactive"),
    configuration: jsonb("configuration").notNull(),
    credentials: jsonb("credentials").notNull(), // Encrypted
    supportedCurrencies: text("supported_currencies").array().default(["USD"]),
    supportedCountries: text("supported_countries").array().default([]),
    feeStructure: jsonb("fee_structure").notNull(),
    minimumAmount: integer("minimum_amount_cents").default(100),
    maximumAmount: integer("maximum_amount_cents"),
    processingTimeHours: integer("processing_time_hours").default(24),
    webhookUrl: varchar("webhook_url"),
    webhookSecret: varchar("webhook_secret"),
    testMode: boolean("test_mode").default(true),
    priority: integer("priority").default(0),
    autoRetryEnabled: boolean("auto_retry_enabled").default(true),
    fraudDetectionSettings: jsonb("fraud_detection_settings").default({}),
    complianceSettings: jsonb("compliance_settings").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_payment_gateways_type").on(table.type),
    index("idx_payment_gateways_status").on(table.status),
    index("idx_payment_gateways_priority").on(table.priority),
  ],
);

// Deposits Management
export const depositMethodEnum = pgEnum("deposit_method", [
  "bank_transfer",
  "wire",
  "crypto",
  "card",
  "paypal",
  "stripe_transfer",
]);
export const depositStatusEnum = pgEnum("deposit_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "under_review",
]);
export const amlStatusEnum = pgEnum("aml_status", [
  "clear",
  "flagged",
  "under_review",
  "blocked",
  "escalated",
]);

export const depositMethods = pgTable(
  "deposit_methods",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: depositMethodEnum("method").notNull(),
    accountDetails: jsonb("account_details").notNull(), // Encrypted bank/crypto details
    verificationStatus: varchar("verification_status").default("pending"),
    verificationDocuments: jsonb("verification_documents").default({}),
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),
    minimumDeposit: integer("minimum_deposit_cents").default(1000),
    maximumDeposit: integer("maximum_deposit_cents").default(1000000),
    feeStructure: jsonb("fee_structure").default({}),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_deposit_methods_user").on(table.userId),
    index("idx_deposit_methods_method").on(table.method),
    index("idx_deposit_methods_verification").on(table.verificationStatus),
  ],
);

export const deposits = pgTable(
  "deposits",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    depositMethodId: varchar("deposit_method_id").references(
      () => depositMethods.id,
    ),
    referenceNumber: varchar("reference_number").notNull().unique(),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency").default("USD"),
    exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }),
    convertedAmountCents: integer("converted_amount_cents"),
    feeCents: integer("fee_cents").default(0),
    netAmountCents: integer("net_amount_cents").notNull(),
    status: depositStatusEnum("status").default("pending"),
    amlStatus: amlStatusEnum("aml_status").default("clear"),
    riskScore: integer("risk_score").default(0),
    gatewayId: varchar("gateway_id").references(() => paymentGateways.id),
    externalReference: varchar("external_reference"),
    processedBy: varchar("processed_by").references(() => users.id),
    processedAt: timestamp("processed_at"),
    notes: text("notes"),
    fraudAnalysis: jsonb("fraud_analysis").default({}),
    complianceChecks: jsonb("compliance_checks").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_deposits_user").on(table.userId),
    index("idx_deposits_status").on(table.status),
    index("idx_deposits_aml_status").on(table.amlStatus),
    index("idx_deposits_created_at").on(table.createdAt.desc()),
    index("idx_deposits_reference").on(table.referenceNumber),
  ],
);

// Financial Reporting and Analytics
export const financialReportTypeEnum = pgEnum("financial_report_type", [
  "revenue",
  "transactions",
  "tax",
  "billing",
  "deposits",
  "payouts",
  "compliance",
]);
export const financialReportFormatEnum = pgEnum("financial_report_format", [
  "pdf",
  "csv",
  "xlsx",
  "json",
]);

export const financialReports = pgTable(
  "financial_reports",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    type: financialReportTypeEnum("type").notNull(),
    format: financialReportFormatEnum("format").default("pdf"),
    schedule: varchar("schedule"), // cron expression for automated reports
    parameters: jsonb("parameters").default({}),
    filters: jsonb("filters").default({}),
    generatedBy: varchar("generated_by").references(() => users.id),
    generatedAt: timestamp("generated_at"),
    fileUrl: varchar("file_url"),
    fileSize: integer("file_size"),
    recordCount: integer("record_count"),
    status: varchar("status").default("pending"),
    error: text("error"),
    isAutomated: boolean("is_automated").default(false),
    retentionDays: integer("retention_days").default(365),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_financial_reports_type").on(table.type),
    index("idx_financial_reports_generated_by").on(table.generatedBy),
    index("idx_financial_reports_generated_at").on(table.generatedAt.desc()),
  ],
);

// Fraud Detection and Risk Management
export const fraudRuleTypeEnum = pgEnum("fraud_rule_type", [
  "velocity",
  "amount",
  "geo",
  "device",
  "behavioral",
  "pattern",
]);
export const riskLevelEnum = pgEnum("risk_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const fraudRules = pgTable(
  "fraud_rules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    type: fraudRuleTypeEnum("type").notNull(),
    riskLevel: riskLevelEnum("risk_level").notNull(),
    isActive: boolean("is_active").default(true),
    conditions: jsonb("conditions").notNull(),
    actions: jsonb("actions").notNull(),
    scoreAdjustment: integer("score_adjustment").default(0),
    blockTransaction: boolean("block_transaction").default(false),
    requireManualReview: boolean("require_manual_review").default(false),
    notifyAdmin: boolean("notify_admin").default(false),
    priority: integer("priority").default(0),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_fraud_rules_type").on(table.type),
    index("idx_fraud_rules_active").on(table.isActive),
    index("idx_fraud_rules_priority").on(table.priority),
  ],
);

export const fraudAlerts = pgTable(
  "fraud_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    transactionId: varchar("transaction_id").references(() => transactions.id),
    depositId: varchar("deposit_id").references(() => deposits.id),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    ruleId: varchar("rule_id").references(() => fraudRules.id),
    riskScore: integer("risk_score").notNull(),
    riskLevel: riskLevelEnum("risk_level").notNull(),
    status: varchar("status").default("pending"),
    reviewedBy: varchar("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    resolution: varchar("resolution"),
    notes: text("notes"),
    triggerData: jsonb("trigger_data").notNull(),
    actionsTaken: jsonb("actions_taken").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_fraud_alerts_user").on(table.userId),
    index("idx_fraud_alerts_status").on(table.status),
    index("idx_fraud_alerts_risk_level").on(table.riskLevel),
    index("idx_fraud_alerts_created_at").on(table.createdAt.desc()),
  ],
);

// AML/KYC Enhanced Tracking
export const amlCheckTypeEnum = pgEnum("aml_check_type", [
  "sanctions",
  "pep",
  "adverse_media",
  "identity",
  "source_of_funds",
]);
export const kycDocumentTypeEnum = pgEnum("kyc_document_type", [
  "passport",
  "drivers_license",
  "national_id",
  "utility_bill",
  "bank_statement",
  "tax_document",
]);

export const amlChecks = pgTable(
  "aml_checks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    checkType: amlCheckTypeEnum("check_type").notNull(),
    provider: varchar("provider").notNull(),
    providerReference: varchar("provider_reference"),
    status: varchar("status").default("pending"),
    result: varchar("result"),
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    matchDetails: jsonb("match_details").default({}),
    rawResponse: jsonb("raw_response").default({}),
    cost: integer("cost_cents").default(0),
    processedAt: timestamp("processed_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_aml_checks_user").on(table.userId),
    index("idx_aml_checks_type").on(table.checkType),
    index("idx_aml_checks_status").on(table.status),
    index("idx_aml_checks_expires_at").on(table.expiresAt),
  ],
);

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: kycDocumentTypeEnum("document_type").notNull(),
    frontImageUrl: varchar("front_image_url"),
    backImageUrl: varchar("back_image_url"),
    extractedData: jsonb("extracted_data").default({}),
    verificationStatus: varchar("verification_status").default("pending"),
    verificationProvider: varchar("verification_provider"),
    verificationReference: varchar("verification_reference"),
    rejectionReason: text("rejection_reason"),
    expiryDate: timestamp("expiry_date"),
    issuingCountry: varchar("issuing_country"),
    documentNumber: varchar("document_number"),
    uploadedAt: timestamp("uploaded_at").defaultNow(),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_kyc_documents_user").on(table.userId),
    index("idx_kyc_documents_type").on(table.documentType),
    index("idx_kyc_documents_status").on(table.verificationStatus),
  ],
);

// Financial Admin Settings
export const financialSettings = pgTable(
  "financial_settings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    settingKey: varchar("setting_key").notNull().unique(),
    settingValue: jsonb("setting_value").notNull(),
    description: text("description"),
    category: varchar("category").notNull(),
    isEncrypted: boolean("is_encrypted").default(false),
    lastModifiedBy: varchar("last_modified_by").references(() => users.id),
    validationRules: jsonb("validation_rules").default({}),
    effectiveFrom: timestamp("effective_from").defaultNow(),
    effectiveTo: timestamp("effective_to"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_financial_settings_category").on(table.category),
    index("idx_financial_settings_effective").on(
      table.effectiveFrom,
      table.effectiveTo,
    ),
  ],
);

// ===== 6. MULTI-CLOUD STORAGE PROVIDER SYSTEM =====
export const storageProviderEnum = pgEnum("storage_provider", [
  "aws_s3",
  "digitalocean_spaces",
  "wasabi",
  "backblaze_b2",
  "vultr_object_storage",
  "pushr",
]);

export const storageConfigStatusEnum = pgEnum("storage_config_status", [
  "active",
  "inactive",
  "testing",
  "error",
  "maintenance",
]);

export const storageHealthStatusEnum = pgEnum("storage_health_status", [
  "healthy",
  "degraded",
  "unhealthy",
  "unknown",
]);

export const storageTierEnum = pgEnum("storage_tier", [
  "hot",
  "warm",
  "cold",
  "archive",
]);

// Storage provider configurations
export const storageProviderConfigs = pgTable(
  "storage_provider_configs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: storageProviderEnum("provider").notNull(),
    name: varchar("name").notNull(), // Display name
    isActive: boolean("is_active").default(false),
    isPrimary: boolean("is_primary").default(false), // Primary provider for uploads
    status: storageConfigStatusEnum("status").default("inactive"),

    // Generic configuration (encrypted JSON)
    configData: jsonb("config_data").notNull().default({}),

    // Provider-specific fields
    region: varchar("region"),
    bucket: varchar("bucket"),
    endpoint: varchar("endpoint"), // Custom endpoints for compatible providers
    cdnHostname: varchar("cdn_hostname"), // For CDN configurations

    // Cost and performance settings
    costPerGb: decimal("cost_per_gb", { precision: 10, scale: 6 }),
    bandwidthCostPerGb: decimal("bandwidth_cost_per_gb", {
      precision: 10,
      scale: 6,
    }),
    maxStorageGb: integer("max_storage_gb"), // Storage limits
    maxBandwidthGb: integer("max_bandwidth_gb"), // Bandwidth limits

    // Feature flags
    cdnEnabled: boolean("cdn_enabled").default(false),
    versioning: boolean("versioning").default(false),
    encryption: boolean("encryption").default(true),
    publicRead: boolean("public_read").default(false),

    // Monitoring and alerting
    healthCheckEnabled: boolean("health_check_enabled").default(true),
    healthCheckIntervalMinutes: integer(
      "health_check_interval_minutes",
    ).default(5),
    alertThresholds: jsonb("alert_thresholds").default({}),

    // Metadata
    description: text("description"),
    tags: text("tags").array().default([]),
    configuredBy: varchar("configured_by")
      .notNull()
      .references(() => users.id),
    lastConfiguredBy: varchar("last_configured_by").references(() => users.id),
    lastTestResult: jsonb("last_test_result").default({}),
    lastTestedAt: timestamp("last_tested_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("unique_provider_name").on(table.provider, table.name),
    index("idx_storage_provider_active").on(table.isActive),
    index("idx_storage_provider_primary").on(table.isPrimary),
    index("idx_storage_provider_status").on(table.status),
  ],
);

// Storage provider health monitoring
export const storageProviderHealth = pgTable(
  "storage_provider_health",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    providerId: varchar("provider_id")
      .notNull()
      .references(() => storageProviderConfigs.id, { onDelete: "cascade" }),
    healthStatus: storageHealthStatusEnum("health_status").notNull(),
    responseTimeMs: integer("response_time_ms"),
    availability: decimal("availability", { precision: 5, scale: 2 }), // Percentage
    errorRate: decimal("error_rate", { precision: 5, scale: 2 }), // Percentage
    lastError: text("last_error"),
    errorDetails: jsonb("error_details").default({}),

    // Performance metrics
    uploadSpeedMbps: decimal("upload_speed_mbps", { precision: 10, scale: 2 }),
    downloadSpeedMbps: decimal("download_speed_mbps", {
      precision: 10,
      scale: 2,
    }),

    // Storage metrics
    totalStorageGb: decimal("total_storage_gb", { precision: 15, scale: 6 }),
    usedStorageGb: decimal("used_storage_gb", { precision: 15, scale: 6 }),
    fileCount: integer("file_count"),

    checkedAt: timestamp("checked_at").defaultNow(),
  },
  (table) => [
    index("idx_storage_health_provider_time").on(
      table.providerId,
      table.checkedAt.desc(),
    ),
    index("idx_storage_health_status").on(table.healthStatus),
  ],
);

// Storage cost tracking
export const storageProviderCosts = pgTable(
  "storage_provider_costs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    providerId: varchar("provider_id")
      .notNull()
      .references(() => storageProviderConfigs.id, { onDelete: "cascade" }),

    // Cost metrics for the period
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    storageCost: decimal("storage_cost", { precision: 10, scale: 4 }).default(
      "0",
    ),
    bandwidthCost: decimal("bandwidth_cost", {
      precision: 10,
      scale: 4,
    }).default("0"),
    requestCost: decimal("request_cost", { precision: 10, scale: 4 }).default(
      "0",
    ),
    totalCost: decimal("total_cost", { precision: 10, scale: 4 }).default("0"),

    // Usage metrics
    averageStorageGb: decimal("average_storage_gb", {
      precision: 15,
      scale: 6,
    }),
    totalBandwidthGb: decimal("total_bandwidth_gb", {
      precision: 15,
      scale: 6,
    }),
    totalRequests: integer("total_requests"),

    // Cost optimization recommendations
    recommendations: jsonb("recommendations").default([]),
    potentialSavings: decimal("potential_savings", {
      precision: 10,
      scale: 4,
    }).default("0"),

    calculatedAt: timestamp("calculated_at").defaultNow(),
  },
  (table) => [
    index("idx_storage_costs_provider_period").on(
      table.providerId,
      table.periodStart.desc(),
    ),
    index("idx_storage_costs_period").on(table.periodStart, table.periodEnd),
  ],
);

// Storage provider alerts
export const storageProviderAlerts = pgTable(
  "storage_provider_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    providerId: varchar("provider_id")
      .notNull()
      .references(() => storageProviderConfigs.id, { onDelete: "cascade" }),
    alertType: varchar("alert_type").notNull(), // cost, performance, availability, error
    severity: varchar("severity").notNull(), // low, medium, high, critical
    title: varchar("title").notNull(),
    message: text("message").notNull(),
    details: jsonb("details").default({}),

    // Alert status
    isAcknowledged: boolean("is_acknowledged").default(false),
    acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
    acknowledgedAt: timestamp("acknowledged_at"),

    isResolved: boolean("is_resolved").default(false),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    resolutionNotes: text("resolution_notes"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_storage_alerts_provider").on(table.providerId),
    index("idx_storage_alerts_severity").on(table.severity),
    index("idx_storage_alerts_unresolved").on(
      table.isResolved,
      table.createdAt.desc(),
    ),
  ],
);

// Storage provider failover configurations
export const storageProviderFailover = pgTable(
  "storage_provider_failover",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    primaryProviderId: varchar("primary_provider_id")
      .notNull()
      .references(() => storageProviderConfigs.id, { onDelete: "cascade" }),
    backupProviderId: varchar("backup_provider_id")
      .notNull()
      .references(() => storageProviderConfigs.id, { onDelete: "cascade" }),

    // Failover settings
    isActive: boolean("is_active").default(true),
    failoverThreshold: integer("failover_threshold").default(3), // Number of failed checks before failover
    healthCheckIntervalSeconds: integer(
      "health_check_interval_seconds",
    ).default(30),
    automaticFailback: boolean("automatic_failback").default(false),

    // Failover history
    lastFailoverAt: timestamp("last_failover_at"),
    failoverCount: integer("failover_count").default(0),
    lastFailbackAt: timestamp("last_failback_at"),
    failbackCount: integer("failback_count").default(0),

    // Configuration
    syncEnabled: boolean("sync_enabled").default(false), // Whether to sync data between providers
    syncIntervalHours: integer("sync_interval_hours").default(24),
    lastSyncAt: timestamp("last_sync_at"),

    configuredBy: varchar("configured_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("unique_primary_backup").on(
      table.primaryProviderId,
      table.backupProviderId,
    ),
    index("idx_failover_active").on(table.isActive),
    index("idx_failover_primary").on(table.primaryProviderId),
  ],
);

// ===== 7. USER MANAGEMENT ENHANCEMENTS =====
export const suspensionReasonEnum = pgEnum("suspension_reason", [
  "violation",
  "abuse",
  "fraud",
  "dmca",
  "manual",
  "auto_flag",
]);
export const banTypeEnum = pgEnum("ban_type", [
  "temporary",
  "permanent",
  "shadow",
]);

export const userSuspensions = pgTable(
  "user_suspensions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: suspensionReasonEnum("reason").notNull(),
    banType: banTypeEnum("ban_type").notNull(),
    description: text("description").notNull(),
    violationDetails: jsonb("violation_details").default({}),
    suspendedBy: varchar("suspended_by")
      .notNull()
      .references(() => users.id),
    duration: integer("duration"), // In hours, null for permanent
    startedAt: timestamp("started_at").defaultNow(),
    endsAt: timestamp("ends_at"),
    liftedAt: timestamp("lifted_at"),
    liftedBy: varchar("lifted_by").references(() => users.id),
    liftReason: text("lift_reason"),
    appealSubmitted: boolean("appeal_submitted").default(false),
    appealText: text("appeal_text"),
    appealedAt: timestamp("appealed_at"),
    appealDecision: varchar("appeal_decision"), // approved, rejected, pending
    appealDecidedBy: varchar("appeal_decided_by").references(() => users.id),
    appealDecidedAt: timestamp("appeal_decided_at"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_user_suspensions_user").on(table.userId),
    index("idx_user_suspensions_active").on(table.isActive),
    index("idx_user_suspensions_ends").on(table.endsAt),
  ],
);

export const userActivityLog = pgTable(
  "user_activity_log",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activity: varchar("activity").notNull(), // login, logout, post_create, message_send, etc.
    details: jsonb("details").default({}),
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    sessionId: varchar("session_id"),
    timestamp: timestamp("timestamp").defaultNow(),
  },
  (table) => [
    index("idx_user_activity_user_time").on(
      table.userId,
      table.timestamp.desc(),
    ),
    index("idx_user_activity_activity").on(table.activity),
  ],
);

// ===== SYSTEM SETTINGS MANAGEMENT =====
export const systemSettingTypeEnum = pgEnum("system_setting_type", [
  "string",
  "number",
  "boolean",
  "json",
  "encrypted",
]);
export const systemSettingCategoryEnum = pgEnum("system_setting_category", [
  "general",
  "maintenance",
  "email",
  "theme",
  "security",
  "backup",
  "api",
  "features",
  "languages",
  "custom",
]);

export const systemSettings = pgTable(
  "system_settings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: varchar("key").notNull().unique(),
    value: text("value"),
    encryptedValue: text("encrypted_value"), // For sensitive settings
    type: systemSettingTypeEnum("type").default("string").notNull(),
    category: systemSettingCategoryEnum("category")
      .default("general")
      .notNull(),

    // Metadata
    name: varchar("name").notNull(),
    description: text("description"),
    defaultValue: text("default_value"),
    validationRules: jsonb("validation_rules").default({}), // min, max, regex, etc.
    isPublic: boolean("is_public").default(false), // Whether to expose in public API
    isReadOnly: boolean("is_read_only").default(false),
    requiresRestart: boolean("requires_restart").default(false),

    // Environment overrides
    environment: varchar("environment").default("production"), // production, staging, development
    canOverrideInEnv: boolean("can_override_in_env").default(true),
    envVarName: varchar("env_var_name"), // Corresponding environment variable name

    // Audit
    lastModifiedBy: varchar("last_modified_by").references(() => users.id),
    lastModifiedAt: timestamp("last_modified_at").defaultNow(),
    changeReason: text("change_reason"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_system_settings_category").on(table.category),
    index("idx_system_settings_environment").on(table.environment),
    index("idx_system_settings_public").on(table.isPublic),
  ],
);

export const systemSettingHistory = pgTable(
  "system_setting_history",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    settingId: varchar("setting_id")
      .notNull()
      .references(() => systemSettings.id, { onDelete: "cascade" }),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    changeType: varchar("change_type").notNull(), // create, update, delete
    changedBy: varchar("changed_by").references(() => users.id),
    changeReason: text("change_reason"),
    rollbackData: jsonb("rollback_data").default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_system_setting_history_setting").on(table.settingId),
    index("idx_system_setting_history_changed_by").on(table.changedBy),
    index("idx_system_setting_history_created").on(table.createdAt.desc()),
  ],
);

export const maintenanceSchedule = pgTable(
  "maintenance_schedule",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: varchar("title").notNull(),
    description: text("description"),
    maintenanceType: varchar("maintenance_type").notNull(), // planned, emergency, security, update

    // Scheduling
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    timezone: varchar("timezone").default("UTC"),

    // Status
    status: varchar("status").default("scheduled").notNull(), // scheduled, in_progress, completed, cancelled
    actualStartTime: timestamp("actual_start_time"),
    actualEndTime: timestamp("actual_end_time"),

    // Configuration
    enableMaintenanceMode: boolean("enable_maintenance_mode").default(true),
    customMessage: text("custom_message"),
    allowAdminAccess: boolean("allow_admin_access").default(true),
    redirectUrl: varchar("redirect_url"),

    // Notifications
    notifyUsers: boolean("notify_users").default(true),
    notificationChannels: text("notification_channels")
      .array()
      .default(sql`ARRAY['in_app', 'email']`),
    notifyHoursBefore: integer("notify_hours_before").default(24),
    lastNotificationSent: timestamp("last_notification_sent"),

    // Affected services
    affectedServices: text("affected_services")
      .array()
      .default(sql`ARRAY['all']`),
    expectedImpact: varchar("expected_impact").default("full_outage"), // full_outage, partial_outage, degraded_performance

    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_maintenance_schedule_start").on(table.startTime),
    index("idx_maintenance_schedule_status").on(table.status),
    index("idx_maintenance_schedule_type").on(table.maintenanceType),
  ],
);

export const emailSettings = pgTable(
  "email_settings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull().unique(),
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),

    // SMTP Configuration
    smtpHost: varchar("smtp_host").notNull(),
    smtpPort: integer("smtp_port").default(587),
    smtpSecurity: varchar("smtp_security").default("tls"), // none, tls, ssl
    smtpUsername: varchar("smtp_username"),
    smtpPassword: text("smtp_password"), // Encrypted

    // Sender settings
    fromName: varchar("from_name").notNull(),
    fromEmail: varchar("from_email").notNull(),
    replyToEmail: varchar("reply_to_email"),

    // Delivery settings
    maxSendRate: integer("max_send_rate").default(100), // emails per minute
    enableTracking: boolean("enable_tracking").default(true),
    enableBounceHandling: boolean("enable_bounce_handling").default(true),

    // Template settings
    headerHtml: text("header_html"),
    footerHtml: text("footer_html"),
    unsubscribeHtml: text("unsubscribe_html"),

    // Testing
    lastTestedAt: timestamp("last_tested_at"),
    testResults: jsonb("test_results").default({}),

    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_email_settings_default").on(table.isDefault),
    index("idx_email_settings_active").on(table.isActive),
  ],
);

// Storage Provider Insert Schemas
export const insertStorageProviderConfigSchema = createInsertSchema(
  storageProviderConfigs,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertStorageProviderHealthSchema = createInsertSchema(
  storageProviderHealth,
).omit({
  id: true,
});
export const insertStorageProviderCostSchema = createInsertSchema(
  storageProviderCosts,
).omit({
  id: true,
});
export const insertStorageProviderAlertSchema = createInsertSchema(
  storageProviderAlerts,
).omit({
  id: true,
  createdAt: true,
});
export const insertStorageProviderFailoverSchema = createInsertSchema(
  storageProviderFailover,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas for new tables
export const insertLeaderboardSchema = createInsertSchema(leaderboards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertLeaderboardEntrySchema = createInsertSchema(
  leaderboardEntries,
).omit({ id: true, createdAt: true });
export const insertLeaderboardAchievementSchema = createInsertSchema(
  leaderboardAchievements,
).omit({ id: true, createdAt: true });
export const insertUserAchievementSchema = createInsertSchema(
  userAchievements,
).omit({ id: true });

export const insertConsentFormTemplateSchema = createInsertSchema(
  consentFormTemplates,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConsentFormSchema = createInsertSchema(consentForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertConsentNotificationSchema = createInsertSchema(
  consentNotificationSchedule,
).omit({ id: true, createdAt: true });

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  viewsCount: true,
  likesCount: true,
  repliesCount: true,
  createdAt: true,
  updatedAt: true,
});
export const insertStoryViewSchema = createInsertSchema(storyViews).omit({
  id: true,
});
export const insertStoryReplySchema = createInsertSchema(storyReplies).omit({
  id: true,
  createdAt: true,
});

export const insertProductCategorySchema = createInsertSchema(
  productCategories,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertProductVariantSchema = createInsertSchema(
  productVariants,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertOrderLineItemSchema = createInsertSchema(
  orderLineItems,
).omit({ id: true, createdAt: true });

export const insertUserSuspensionSchema = createInsertSchema(
  userSuspensions,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserActivityLogSchema = createInsertSchema(
  userActivityLog,
).omit({ id: true });

// Financial Admin Insert Schemas
export const insertBillingProfileSchema = createInsertSchema(
  billingProfiles,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTaxRateSchema = createInsertSchema(taxRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPaymentGatewaySchema = createInsertSchema(
  paymentGateways,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDepositMethodSchema = createInsertSchema(
  depositMethods,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDepositSchema = createInsertSchema(deposits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFinancialReportSchema = createInsertSchema(
  financialReports,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFraudRuleSchema = createInsertSchema(fraudRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFraudAlertSchema = createInsertSchema(fraudAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAmlCheckSchema = createInsertSchema(amlChecks).omit({
  id: true,
  createdAt: true,
});
export const insertKycDocumentSchema = createInsertSchema(kycDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFinancialSettingSchema = createInsertSchema(
  financialSettings,
).omit({ id: true, createdAt: true, updatedAt: true });

// Types for new tables
export type Leaderboard = typeof leaderboards.$inferSelect;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = z.infer<
  typeof insertLeaderboardEntrySchema
>;
export type LeaderboardAchievement =
  typeof leaderboardAchievements.$inferSelect;
export type InsertLeaderboardAchievement = z.infer<
  typeof insertLeaderboardAchievementSchema
>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type ConsentFormTemplate = typeof consentFormTemplates.$inferSelect;
export type InsertConsentFormTemplate = z.infer<
  typeof insertConsentFormTemplateSchema
>;
export type ConsentForm = typeof consentForms.$inferSelect;
export type InsertConsentForm = z.infer<typeof insertConsentFormSchema>;
export type ConsentNotificationSchedule =
  typeof consentNotificationSchedule.$inferSelect;
export type InsertConsentNotification = z.infer<
  typeof insertConsentNotificationSchema
>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type StoryView = typeof storyViews.$inferSelect;
export type InsertStoryView = z.infer<typeof insertStoryViewSchema>;
export type StoryReply = typeof storyReplies.$inferSelect;
export type InsertStoryReply = z.infer<typeof insertStoryReplySchema>;

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type InsertOrderLineItem = z.infer<typeof insertOrderLineItemSchema>;

export type UserSuspension = typeof userSuspensions.$inferSelect;
export type InsertUserSuspension = z.infer<typeof insertUserSuspensionSchema>;
export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

// Storage Provider Types
export type StorageProviderConfig = typeof storageProviderConfigs.$inferSelect;
export type InsertStorageProviderConfig = z.infer<
  typeof insertStorageProviderConfigSchema
>;
export type UpdateStorageProviderConfig = Partial<InsertStorageProviderConfig>;
export type StorageProviderHealth = typeof storageProviderHealth.$inferSelect;
export type InsertStorageProviderHealth = z.infer<
  typeof insertStorageProviderHealthSchema
>;
export type StorageProviderCost = typeof storageProviderCosts.$inferSelect;
export type InsertStorageProviderCost = z.infer<
  typeof insertStorageProviderCostSchema
>;
export type StorageProviderAlert = typeof storageProviderAlerts.$inferSelect;
export type InsertStorageProviderAlert = z.infer<
  typeof insertStorageProviderAlertSchema
>;
export type StorageProviderFailover =
  typeof storageProviderFailover.$inferSelect;
export type InsertStorageProviderFailover = z.infer<
  typeof insertStorageProviderFailoverSchema
>;

// Financial Admin Types
export type BillingProfile = typeof billingProfiles.$inferSelect;
export type InsertBillingProfile = z.infer<typeof insertBillingProfileSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type TaxRate = typeof taxRates.$inferSelect;
export type InsertTaxRate = z.infer<typeof insertTaxRateSchema>;
export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;
export type DepositMethod = typeof depositMethods.$inferSelect;
export type InsertDepositMethod = z.infer<typeof insertDepositMethodSchema>;
export type Deposit = typeof deposits.$inferSelect;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type FinancialReport = typeof financialReports.$inferSelect;
export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;
export type FraudRule = typeof fraudRules.$inferSelect;
export type InsertFraudRule = z.infer<typeof insertFraudRuleSchema>;
export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;
export type AmlCheck = typeof amlChecks.$inferSelect;
export type InsertAmlCheck = z.infer<typeof insertAmlCheckSchema>;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type InsertKycDocument = z.infer<typeof insertKycDocumentSchema>;
export type FinancialSetting = typeof financialSettings.$inferSelect;
export type InsertFinancialSetting = z.infer<
  typeof insertFinancialSettingSchema
>;

// ===== HELP AND SUPPORT SYSTEM SCHEMA =====
// Comprehensive help desk, wiki, and tutorial system

// Help desk ticket categories and types
export const ticketCategoryEnum = pgEnum("ticket_category", [
  "technical_support",
  "bug_report",
  "feature_request",
  "billing",
  "account_issues",
  "compliance",
  "content_policy",
  "general_inquiry",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
  "critical",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "pending",
  "in_progress",
  "waiting_user",
  "resolved",
  "closed",
  "escalated",
]);

export const ticketChannelEnum = pgEnum("ticket_channel", [
  "in_app",
  "email",
  "chat",
  "api",
  "phone",
]);

// Support tickets table
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ticketNumber: varchar("ticket_number").unique().notNull(), // Human-readable ticket ID
    subject: varchar("subject").notNull(),
    description: text("description").notNull(),
    category: ticketCategoryEnum("category").notNull(),
    priority: ticketPriorityEnum("priority").default("normal").notNull(),
    status: ticketStatusEnum("status").default("open").notNull(),
    channel: ticketChannelEnum("channel").default("in_app").notNull(),

    // User information
    userId: varchar("user_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    userEmail: varchar("user_email"), // For non-registered users
    userName: varchar("user_name"), // For non-registered users

    // Assignment and handling
    assignedTo: varchar("assigned_to").references(() => accounts.id),
    assignedAt: timestamp("assigned_at"),

    // Metadata and tracking
    tags: text("tags").array().default([]),
    metadata: jsonb("metadata").default({}), // Browser, IP, device info, error logs
    customerSatisfaction: integer("customer_satisfaction"), // 1-5 rating

    // Timestamps and SLA tracking
    firstResponseAt: timestamp("first_response_at"),
    resolvedAt: timestamp("resolved_at"),
    closedAt: timestamp("closed_at"),
    slaBreachAt: timestamp("sla_breach_at"), // When SLA will be breached

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_support_tickets_user").on(table.userId),
    index("idx_support_tickets_status").on(table.status),
    index("idx_support_tickets_category").on(table.category),
    index("idx_support_tickets_priority").on(table.priority),
    index("idx_support_tickets_assigned").on(table.assignedTo),
    index("idx_support_tickets_created").on(table.createdAt),
  ],
);

// Ticket comments/messages
export const ticketMessageTypeEnum = pgEnum("ticket_message_type", [
  "user_message",
  "agent_response",
  "internal_note",
  "system_message",
  "auto_response",
]);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ticketId: varchar("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorId: varchar("author_id").references(() => accounts.id), // null for system messages
    type: ticketMessageTypeEnum("type").notNull(),
    content: text("content").notNull(),
    isInternal: boolean("is_internal").default(false), // Internal notes not visible to user
    attachments: jsonb("attachments").default([]), // File attachments
    metadata: jsonb("metadata").default({}),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_ticket_messages_ticket").on(table.ticketId),
    index("idx_ticket_messages_author").on(table.authorId),
    index("idx_ticket_messages_created").on(table.createdAt),
  ],
);

// Wiki categories for organization (declare before using)
export const wikiCategories = pgTable(
  "wiki_categories",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    slug: varchar("slug").unique().notNull(),
    description: text("description"),
    parentId: varchar("parent_id").references(() => wikiCategories.id), // Hierarchical categories
    icon: varchar("icon"), // Icon class or URL
    color: varchar("color"), // Hex color for UI
    sortOrder: integer("sort_order").default(0),
    isVisible: boolean("is_visible").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_wiki_categories_parent").on(table.parentId),
    index("idx_wiki_categories_sort").on(table.sortOrder),
  ],
);

// Tutorial categories (declare before using)
export const tutorialCategories = pgTable(
  "tutorial_categories",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    slug: varchar("slug").unique().notNull(),
    description: text("description"),
    icon: varchar("icon"),
    color: varchar("color"),
    sortOrder: integer("sort_order").default(0),
    isVisible: boolean("is_visible").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_tutorial_categories_sort").on(table.sortOrder)],
);

// Gamification badges (declare before using)
export const badges = pgTable("badges", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"), // Icon URL or class
  color: varchar("color"),
  criteria: jsonb("criteria"), // Requirements to earn badge
  rewardPoints: integer("reward_points").default(0),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wiki articles system
export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "pending_review",
  "published",
  "archived",
  "deprecated",
]);

export const articleTypeEnum = pgEnum("article_type", [
  "guide",
  "tutorial",
  "faq",
  "troubleshooting",
  "policy",
  "announcement",
  "reference",
]);

export const wikiArticles = pgTable(
  "wiki_articles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: varchar("slug").unique().notNull(), // URL-friendly identifier
    title: varchar("title").notNull(),
    excerpt: text("excerpt"), // Short description/summary
    content: text("content").notNull(), // Markdown content
    type: articleTypeEnum("type").notNull(),
    status: articleStatusEnum("status").default("draft").notNull(),

    // Authoring and editing
    authorId: varchar("author_id")
      .notNull()
      .references(() => accounts.id),
    lastEditedBy: varchar("last_edited_by").references(() => accounts.id),
    reviewedBy: varchar("reviewed_by").references(() => accounts.id),

    // Categorization and tagging
    categoryId: varchar("category_id").references(() => wikiCategories.id),
    tags: text("tags").array().default([]),

    // SEO and search
    metaTitle: varchar("meta_title"),
    metaDescription: text("meta_description"),
    keywords: text("keywords").array().default([]),
    searchVector: text("search_vector"), // For full-text search

    // Analytics and feedback
    viewCount: integer("view_count").default(0),
    helpfulVotes: integer("helpful_votes").default(0),
    notHelpfulVotes: integer("not_helpful_votes").default(0),
    averageRating: decimal("average_rating", { precision: 3, scale: 2 }),

    // Publishing and visibility
    publishedAt: timestamp("published_at"),
    featuredUntil: timestamp("featured_until"), // Featured article expiry

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_wiki_articles_slug").on(table.slug),
    index("idx_wiki_articles_status").on(table.status),
    index("idx_wiki_articles_type").on(table.type),
    index("idx_wiki_articles_category").on(table.categoryId),
    index("idx_wiki_articles_author").on(table.authorId),
    index("idx_wiki_articles_published").on(table.publishedAt),
  ],
);

// Tutorial system
export const tutorialStatusEnum = pgEnum("tutorial_status", [
  "draft",
  "published",
  "archived",
  "maintenance",
]);

export const tutorialDifficultyEnum = pgEnum("tutorial_difficulty", [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
]);

export const tutorials = pgTable(
  "tutorials",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: varchar("title").notNull(),
    slug: varchar("slug").unique().notNull(),
    description: text("description"),
    status: tutorialStatusEnum("status").default("draft").notNull(),
    difficulty: tutorialDifficultyEnum("difficulty")
      .default("beginner")
      .notNull(),

    // Content and structure
    steps: jsonb("steps").notNull(), // Array of tutorial steps with content, actions, etc.
    estimatedDuration: integer("estimated_duration"), // Minutes to complete
    prerequisites: text("prerequisites").array().default([]), // Required knowledge/tutorials

    // Authoring
    authorId: varchar("author_id")
      .notNull()
      .references(() => accounts.id),
    categoryId: varchar("category_id").references(() => tutorialCategories.id),
    tags: text("tags").array().default([]),

    // Analytics and engagement
    completionCount: integer("completion_count").default(0),
    averageCompletionTime: integer("average_completion_time"), // Minutes
    successRate: decimal("success_rate", { precision: 5, scale: 2 }), // Percentage
    rating: decimal("rating", { precision: 3, scale: 2 }),

    // Gamification
    rewardPoints: integer("reward_points").default(0),
    badgeId: varchar("badge_id").references(() => badges.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_tutorials_slug").on(table.slug),
    index("idx_tutorials_status").on(table.status),
    index("idx_tutorials_difficulty").on(table.difficulty),
    index("idx_tutorials_category").on(table.categoryId),
    index("idx_tutorials_author").on(table.authorId),
  ],
);

// User tutorial progress tracking
export const tutorialProgressStatusEnum = pgEnum("tutorial_progress_status", [
  "not_started",
  "in_progress",
  "completed",
  "abandoned",
]);

export const userTutorialProgress = pgTable(
  "user_tutorial_progress",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tutorialId: varchar("tutorial_id")
      .notNull()
      .references(() => tutorials.id, { onDelete: "cascade" }),
    status: tutorialProgressStatusEnum("status")
      .default("not_started")
      .notNull(),

    // Progress tracking
    currentStep: integer("current_step").default(0),
    totalSteps: integer("total_steps").notNull(),
    completedSteps: integer("completed_steps").default(0),
    progressPercentage: decimal("progress_percentage", {
      precision: 5,
      scale: 2,
    }).default("0"),

    // Timing and analytics
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    lastAccessedAt: timestamp("last_accessed_at"),
    totalTimeSpent: integer("total_time_spent").default(0), // Seconds

    // User feedback
    rating: integer("rating"), // 1-5 stars
    feedback: text("feedback"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.tutorialId), // One progress record per user per tutorial
    index("idx_user_tutorial_progress_user").on(table.userId),
    index("idx_user_tutorial_progress_tutorial").on(table.tutorialId),
    index("idx_user_tutorial_progress_status").on(table.status),
  ],
);

// User badge assignments
export const userBadges = pgTable(
  "user_badges",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    badgeId: varchar("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at").defaultNow(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.badgeId), // One badge per user
    index("idx_user_badges_user").on(table.userId),
    index("idx_user_badges_badge").on(table.badgeId),
  ],
);

// Knowledge base FAQ entries
export const faqEntries = pgTable(
  "faq_entries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    question: text("question").notNull(),
    answer: text("answer").notNull(), // Markdown content
    categoryId: varchar("category_id").references(() => wikiCategories.id),
    tags: text("tags").array().default([]),
    sortOrder: integer("sort_order").default(0),
    isVisible: boolean("is_visible").default(true),

    // Analytics
    viewCount: integer("view_count").default(0),
    helpfulVotes: integer("helpful_votes").default(0),
    notHelpfulVotes: integer("not_helpful_votes").default(0),

    // Authoring
    authorId: varchar("author_id")
      .notNull()
      .references(() => accounts.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_faq_entries_category").on(table.categoryId),
    index("idx_faq_entries_author").on(table.authorId),
    index("idx_faq_entries_sort").on(table.sortOrder),
  ],
);

// Navigation breadcrumbs for enhanced navigation
export const navigationPaths = pgTable(
  "navigation_paths",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    sessionId: varchar("session_id"),
    path: varchar("path").notNull(), // URL path
    title: varchar("title"), // Page title
    timestamp: timestamp("timestamp").defaultNow(),
    metadata: jsonb("metadata").default({}), // Additional context
  },
  (table) => [
    index("idx_navigation_paths_user").on(table.userId),
    index("idx_navigation_paths_session").on(table.sessionId),
    index("idx_navigation_paths_timestamp").on(table.timestamp),
  ],
);

// Search analytics for improving help content
export const searchAnalytics = pgTable(
  "search_analytics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => accounts.id),
    sessionId: varchar("session_id"),
    query: text("query").notNull(),
    resultsCount: integer("results_count").default(0),
    clickedResultId: varchar("clicked_result_id"), // ID of clicked article/tutorial
    clickedResultType: varchar("clicked_result_type"), // 'article', 'tutorial', 'faq'
    searchContext: varchar("search_context"), // Where search was performed
    timestamp: timestamp("timestamp").defaultNow(),
  },
  (table) => [
    index("idx_search_analytics_user").on(table.userId),
    index("idx_search_analytics_query").on(table.query),
    index("idx_search_analytics_timestamp").on(table.timestamp),
  ],
);

// ===== HELP SYSTEM INSERT SCHEMAS =====

// Support tickets
export const insertSupportTicketSchema = createInsertSchema(
  supportTickets,
).omit({
  id: true,
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Ticket messages
export const insertTicketMessageSchema = createInsertSchema(
  ticketMessages,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;

// Wiki articles
export const insertWikiArticleSchema = createInsertSchema(wikiArticles).omit({
  id: true,
  slug: true,
  viewCount: true,
  helpfulVotes: true,
  notHelpfulVotes: true,
  averageRating: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWikiArticle = z.infer<typeof insertWikiArticleSchema>;
export type WikiArticle = typeof wikiArticles.$inferSelect;

// Wiki categories
export const insertWikiCategorySchema = createInsertSchema(wikiCategories).omit(
  {
    id: true,
    createdAt: true,
    updatedAt: true,
  },
);
export type InsertWikiCategory = z.infer<typeof insertWikiCategorySchema>;
export type WikiCategory = typeof wikiCategories.$inferSelect;

// Tutorials
export const insertTutorialSchema = createInsertSchema(tutorials).omit({
  id: true,
  slug: true,
  completionCount: true,
  averageCompletionTime: true,
  successRate: true,
  rating: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTutorial = z.infer<typeof insertTutorialSchema>;
export type Tutorial = typeof tutorials.$inferSelect;

// Tutorial categories
export const insertTutorialCategorySchema = createInsertSchema(
  tutorialCategories,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTutorialCategory = z.infer<
  typeof insertTutorialCategorySchema
>;
export type TutorialCategory = typeof tutorialCategories.$inferSelect;

// User tutorial progress
export const insertUserTutorialProgressSchema = createInsertSchema(
  userTutorialProgress,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserTutorialProgress = z.infer<
  typeof insertUserTutorialProgressSchema
>;
export type UserTutorialProgress = typeof userTutorialProgress.$inferSelect;

// FAQ entries
export const insertFaqEntrySchema = createInsertSchema(faqEntries).omit({
  id: true,
  viewCount: true,
  helpfulVotes: true,
  notHelpfulVotes: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFaqEntry = z.infer<typeof insertFaqEntrySchema>;
export type FaqEntry = typeof faqEntries.$inferSelect;

// Badges
export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

// User badges
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  createdAt: true,
});
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// Navigation paths
export const insertNavigationPathSchema = createInsertSchema(
  navigationPaths,
).omit({
  id: true,
});
export type InsertNavigationPath = z.infer<typeof insertNavigationPathSchema>;
export type NavigationPath = typeof navigationPaths.$inferSelect;

// Search analytics
export const insertSearchAnalyticsSchema = createInsertSchema(
  searchAnalytics,
).omit({
  id: true,
});
export type InsertSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;
export type SearchAnalytics = typeof searchAnalytics.$inferSelect;

// ===== REFERRAL & AFFILIATE SYSTEM =====

// Referral code status enum
export const referralCodeStatusEnum = pgEnum("referral_code_status", [
  "active",
  "inactive",
  "expired",
  "suspended",
]);

// Referral codes table - unique codes for each user/creator
export const referralCodes = pgTable(
  "referral_codes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    code: varchar("code").unique().notNull(), // Unique referral code (e.g., BOYFANZ123)
    type: varchar("type").notNull().default("standard"), // standard, campaign, custom
    status: referralCodeStatusEnum("status").default("active").notNull(),

    // Configuration
    description: text("description"), // Optional description
    maxUses: integer("max_uses"), // null for unlimited
    currentUses: integer("current_uses").default(0),
    expiresAt: timestamp("expires_at"), // null for no expiration

    // Reward configuration
    rewardType: varchar("reward_type").notNull().default("percentage"), // percentage, fixed, credits
    rewardValue: decimal("reward_value", { precision: 10, scale: 2 }).notNull(), // Amount or percentage
    refereeRewardType: varchar("referee_reward_type").default("credits"), // What referred user gets
    refereeRewardValue: decimal("referee_reward_value", {
      precision: 10,
      scale: 2,
    }).default("0"),

    // Campaign association
    campaignId: varchar("campaign_id").references(() => referralCampaigns.id),

    // Analytics
    clickCount: integer("click_count").default(0),
    conversionCount: integer("conversion_count").default(0),
    totalEarnings: decimal("total_earnings", {
      precision: 15,
      scale: 2,
    }).default("0"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_referral_codes_user").on(table.userId),
    index("idx_referral_codes_status").on(table.status),
    index("idx_referral_codes_campaign").on(table.campaignId),
    index("idx_referral_codes_expires").on(table.expiresAt),
  ],
);

// Referral campaigns for special promotions
export const referralCampaignStatusEnum = pgEnum("referral_campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const referralCampaigns = pgTable(
  "referral_campaigns",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    description: text("description"),
    slug: varchar("slug").unique().notNull(),
    status: referralCampaignStatusEnum("status").default("draft").notNull(),

    // Timing
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),

    // Targeting
    targetAudience: varchar("target_audience").default("all"), // all, creators, fans, new_users
    eligibleUserTypes: text("eligible_user_types").array().default([]), // Array of user types
    minAccountAge: integer("min_account_age"), // Days
    excludeExistingReferrers: boolean("exclude_existing_referrers").default(
      false,
    ),

    // Reward structure
    rewardStructure: jsonb("reward_structure").default({}), // Complex reward rules
    tierRewards: jsonb("tier_rewards").default({}), // Different rewards per tier
    bonusMilestones: jsonb("bonus_milestones").default({}), // Special milestone bonuses

    // Limits and rules
    maxParticipants: integer("max_participants"), // null for unlimited
    maxRewards: decimal("max_rewards", { precision: 15, scale: 2 }), // Total budget cap
    maxRewardsPerUser: decimal("max_rewards_per_user", {
      precision: 10,
      scale: 2,
    }),

    // Analytics
    participantCount: integer("participant_count").default(0),
    totalRewardsIssued: decimal("total_rewards_issued", {
      precision: 15,
      scale: 2,
    }).default("0"),
    conversionRate: decimal("conversion_rate", {
      precision: 5,
      scale: 2,
    }).default("0"),

    // Configuration
    autoApprove: boolean("auto_approve").default(true),
    requireManualReview: boolean("require_manual_review").default(false),

    createdBy: varchar("created_by")
      .notNull()
      .references(() => accounts.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_referral_campaigns_status").on(table.status),
    index("idx_referral_campaigns_dates").on(table.startDate, table.endDate),
    index("idx_referral_campaigns_creator").on(table.createdBy),
  ],
);

// Referral tracking for attribution and analytics
export const attributionTypeEnum = pgEnum("attribution_type", [
  "first_click",
  "last_click",
  "multi_touch",
  "time_decay",
]);
export const conversionTypeEnum = pgEnum("conversion_type", [
  "signup",
  "purchase",
  "subscription",
  "deposit",
  "content_purchase",
]);

export const referralTracking = pgTable(
  "referral_tracking",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    referralCodeId: varchar("referral_code_id")
      .notNull()
      .references(() => referralCodes.id, { onDelete: "cascade" }),
    referrerId: varchar("referrer_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // Tracking data
    clickId: varchar("click_id").unique(), // Unique identifier for this click
    sourceUrl: text("source_url"), // Where the click came from
    landingUrl: text("landing_url"), // Where they landed
    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),
    deviceFingerprint: varchar("device_fingerprint"),

    // Attribution
    attributionType:
      attributionTypeEnum("attribution_type").default("last_click"),
    attributionWeight: decimal("attribution_weight", {
      precision: 3,
      scale: 2,
    }).default("1.00"),

    // Conversion data (null until conversion happens)
    convertedUserId: varchar("converted_user_id").references(() => accounts.id),
    conversionType: conversionTypeEnum("conversion_type"),
    conversionValue: decimal("conversion_value", { precision: 15, scale: 2 }),
    conversionMetadata: jsonb("conversion_metadata").default({}),
    convertedAt: timestamp("converted_at"),

    // Geographic and session data
    country: varchar("country"),
    region: varchar("region"),
    city: varchar("city"),
    sessionId: varchar("session_id"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_referral_tracking_code").on(table.referralCodeId),
    index("idx_referral_tracking_referrer").on(table.referrerId),
    index("idx_referral_tracking_converted").on(table.convertedUserId),
    index("idx_referral_tracking_conversion").on(
      table.conversionType,
      table.convertedAt,
    ),
    index("idx_referral_tracking_attribution").on(table.attributionType),
    index("idx_referral_tracking_ip").on(table.ipAddress),
    index("idx_referral_tracking_fingerprint").on(table.deviceFingerprint),
  ],
);

// Referral relationships - parent-child relationships between users
export const relationshipTypeEnum = pgEnum("relationship_type", [
  "direct",
  "indirect",
]);
export const relationshipStatusEnum = pgEnum("relationship_status", [
  "active",
  "inactive",
  "disputed",
]);

export const referralRelationships = pgTable(
  "referral_relationships",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    referrerId: varchar("referrer_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    refereeId: varchar("referee_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // Relationship details
    type: relationshipTypeEnum("type").default("direct").notNull(),
    level: integer("level").default(1).notNull(), // 1 = direct, 2 = second level, etc.
    status: relationshipStatusEnum("status").default("active").notNull(),

    // Original referral data
    referralCodeId: varchar("referral_code_id").references(
      () => referralCodes.id,
    ),
    campaignId: varchar("campaign_id").references(() => referralCampaigns.id),
    trackingId: varchar("tracking_id").references(() => referralTracking.id),

    // Earnings tracking
    totalEarnings: decimal("total_earnings", {
      precision: 15,
      scale: 2,
    }).default("0"),
    lifetimeValue: decimal("lifetime_value", {
      precision: 15,
      scale: 2,
    }).default("0"),
    lastActivityAt: timestamp("last_activity_at"),

    // Fraud detection
    fraudScore: decimal("fraud_score", { precision: 3, scale: 2 }).default("0"),
    isVerified: boolean("is_verified").default(false),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: varchar("verified_by").references(() => accounts.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique().on(table.referrerId, table.refereeId), // Prevent duplicate relationships
    index("idx_referral_relationships_referrer").on(table.referrerId),
    index("idx_referral_relationships_referee").on(table.refereeId),
    index("idx_referral_relationships_level").on(table.level),
    index("idx_referral_relationships_status").on(table.status),
    index("idx_referral_relationships_fraud").on(table.fraudScore),
  ],
);

// Referral earnings and commissions
export const earningsStatusEnum = pgEnum("earnings_status", [
  "pending",
  "approved",
  "paid",
  "disputed",
  "cancelled",
]);
export const earningsTypeEnum = pgEnum("earnings_type", [
  "signup_bonus",
  "percentage_commission",
  "fixed_commission",
  "milestone_bonus",
  "tier_bonus",
  "campaign_bonus",
]);

export const referralEarnings = pgTable(
  "referral_earnings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    referrerId: varchar("referrer_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    refereeId: varchar("referee_id").references(() => accounts.id, {
      onDelete: "set null",
    }),

    // Earning details
    type: earningsTypeEnum("type").notNull(),
    status: earningsStatusEnum("status").default("pending").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency").default("USD").notNull(),

    // Source tracking
    referralCodeId: varchar("referral_code_id").references(
      () => referralCodes.id,
    ),
    campaignId: varchar("campaign_id").references(() => referralCampaigns.id),
    relationshipId: varchar("relationship_id").references(
      () => referralRelationships.id,
    ),
    trackingId: varchar("tracking_id").references(() => referralTracking.id),

    // Transaction details
    sourceTransactionId: varchar("source_transaction_id"), // Original transaction that generated this earning
    commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }), // For percentage commissions
    sourceAmount: decimal("source_amount", { precision: 15, scale: 2 }), // Original transaction amount

    // Payout information
    payoutId: varchar("payout_id"), // Reference to payout batch
    payoutMethod: varchar("payout_method"), // paypal, stripe, credits, etc.
    payoutDetails: jsonb("payout_details").default({}),
    paidAt: timestamp("paid_at"),

    // Processing
    processedAt: timestamp("processed_at"),
    processedBy: varchar("processed_by").references(() => accounts.id),
    notes: text("notes"),
    metadata: jsonb("metadata").default({}),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_referral_earnings_referrer").on(table.referrerId),
    index("idx_referral_earnings_referee").on(table.refereeId),
    index("idx_referral_earnings_status").on(table.status),
    index("idx_referral_earnings_type").on(table.type),
    index("idx_referral_earnings_campaign").on(table.campaignId),
    index("idx_referral_earnings_payout").on(table.payoutId),
    index("idx_referral_earnings_created").on(table.createdAt),
  ],
);

// Affiliate performance metrics and tiers
export const affiliateTierEnum = pgEnum("affiliate_tier", [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]);
export const affiliateStatusEnum = pgEnum("affiliate_status", [
  "active",
  "inactive",
  "suspended",
  "pending_approval",
]);

export const affiliateProfiles = pgTable(
  "affiliate_profiles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .unique()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // Affiliate details
    affiliateId: varchar("affiliate_id").unique().notNull(), // Public affiliate identifier
    status: affiliateStatusEnum("status").default("pending_approval").notNull(),
    tier: affiliateTierEnum("tier").default("bronze").notNull(),

    // Performance metrics
    totalClicks: integer("total_clicks").default(0),
    totalConversions: integer("total_conversions").default(0),
    totalEarnings: decimal("total_earnings", {
      precision: 15,
      scale: 2,
    }).default("0"),
    conversionRate: decimal("conversion_rate", {
      precision: 5,
      scale: 2,
    }).default("0"),
    averageOrderValue: decimal("average_order_value", {
      precision: 10,
      scale: 2,
    }).default("0"),

    // Lifetime metrics
    lifetimeClicks: integer("lifetime_clicks").default(0),
    lifetimeConversions: integer("lifetime_conversions").default(0),
    lifetimeEarnings: decimal("lifetime_earnings", {
      precision: 15,
      scale: 2,
    }).default("0"),

    // Period performance (current month/quarter)
    periodStartDate: timestamp("period_start_date"),
    periodClicks: integer("period_clicks").default(0),
    periodConversions: integer("period_conversions").default(0),
    periodEarnings: decimal("period_earnings", {
      precision: 15,
      scale: 2,
    }).default("0"),

    // Streaks and achievements
    currentStreak: integer("current_streak").default(0), // Days with activity
    longestStreak: integer("longest_streak").default(0),
    achievementBadges: text("achievement_badges").array().default([]),

    // Preferences and settings
    payoutThreshold: decimal("payout_threshold", {
      precision: 10,
      scale: 2,
    }).default("50.00"),
    preferredPayoutMethod: varchar("preferred_payout_method").default("paypal"),
    payoutSchedule: varchar("payout_schedule").default("monthly"), // weekly, biweekly, monthly
    notificationPreferences: jsonb("notification_preferences").default({}),

    // Marketing assets
    customBrandingEnabled: boolean("custom_branding_enabled").default(false),
    logoUrl: varchar("logo_url"),
    websiteUrl: varchar("website_url"),
    socialMediaLinks: jsonb("social_media_links").default({}),

    // Approval and verification
    approvedAt: timestamp("approved_at"),
    approvedBy: varchar("approved_by").references(() => accounts.id),
    rejectedAt: timestamp("rejected_at"),
    rejectionReason: text("rejection_reason"),

    // Last activity tracking
    lastActivityAt: timestamp("last_activity_at"),
    lastLoginAt: timestamp("last_login_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_affiliate_profiles_user").on(table.userId),
    index("idx_affiliate_profiles_affiliate_id").on(table.affiliateId),
    index("idx_affiliate_profiles_status").on(table.status),
    index("idx_affiliate_profiles_tier").on(table.tier),
    index("idx_affiliate_profiles_performance").on(
      table.totalEarnings,
      table.conversionRate,
    ),
  ],
);

// Gamification and achievement system
export const achievementTypeEnum = pgEnum("achievement_type", [
  "referral_count",
  "earnings_milestone",
  "conversion_rate",
  "streak",
  "tier_upgrade",
  "special_event",
]);
export const achievementStatusEnum = pgEnum("achievement_status", [
  "locked",
  "unlocked",
  "claimed",
]);

export const referralAchievements = pgTable(
  "referral_achievements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // Achievement details
    achievementType: achievementTypeEnum("achievement_type").notNull(),
    achievementId: varchar("achievement_id").notNull(), // Predefined achievement identifier
    status: achievementStatusEnum("status").default("locked").notNull(),

    // Achievement data
    title: varchar("title").notNull(),
    description: text("description"),
    iconUrl: varchar("icon_url"),
    badgeUrl: varchar("badge_url"),

    // Requirements and progress
    requirement: jsonb("requirement").notNull(), // What needs to be achieved
    currentProgress: decimal("current_progress", {
      precision: 10,
      scale: 2,
    }).default("0"),
    targetProgress: decimal("target_progress", {
      precision: 10,
      scale: 2,
    }).notNull(),
    progressPercentage: decimal("progress_percentage", {
      precision: 5,
      scale: 2,
    }).default("0"),

    // Rewards
    rewardType: varchar("reward_type"), // credits, tier_upgrade, special_access, etc.
    rewardValue: decimal("reward_value", { precision: 10, scale: 2 }),
    rewardMetadata: jsonb("reward_metadata").default({}),

    // Timing
    unlockedAt: timestamp("unlocked_at"),
    claimedAt: timestamp("claimed_at"),
    expiresAt: timestamp("expires_at"), // For time-limited achievements

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.achievementId), // One achievement per user
    index("idx_referral_achievements_user").on(table.userId),
    index("idx_referral_achievements_type").on(table.achievementType),
    index("idx_referral_achievements_status").on(table.status),
  ],
);

// Fraud detection and prevention
export const fraudEventTypeEnum = pgEnum("fraud_event_type", [
  "suspicious_signup",
  "duplicate_device",
  "ip_abuse",
  "rapid_referrals",
  "unusual_pattern",
  "self_referral",
]);
export const fraudStatusEnum = pgEnum("fraud_status", [
  "flagged",
  "investigating",
  "confirmed",
  "false_positive",
  "resolved",
]);

export const referralFraudEvents = pgTable(
  "referral_fraud_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Event details
    eventType: fraudEventTypeEnum("event_type").notNull(),
    status: fraudStatusEnum("status").default("flagged").notNull(),
    severity: varchar("severity").default("medium").notNull(), // low, medium, high, critical

    // Affected entities
    referrerId: varchar("referrer_id").references(() => accounts.id),
    refereeId: varchar("referee_id").references(() => accounts.id),
    referralCodeId: varchar("referral_code_id").references(
      () => referralCodes.id,
    ),
    trackingId: varchar("tracking_id").references(() => referralTracking.id),

    // Detection data
    detectionReason: text("detection_reason").notNull(),
    evidenceData: jsonb("evidence_data").default({}), // IP addresses, devices, patterns, etc.
    riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
    automaticAction: varchar("automatic_action"), // suspend, flag, block, etc.

    // Investigation
    investigatedBy: varchar("investigated_by").references(() => accounts.id),
    investigatedAt: timestamp("investigated_at"),
    investigationNotes: text("investigation_notes"),
    resolution: text("resolution"),
    resolvedAt: timestamp("resolved_at"),

    // Prevention actions
    actionTaken: text("action_taken"),
    appealsAllowed: boolean("appeals_allowed").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_referral_fraud_events_referrer").on(table.referrerId),
    index("idx_referral_fraud_events_referee").on(table.refereeId),
    index("idx_referral_fraud_events_type").on(table.eventType),
    index("idx_referral_fraud_events_status").on(table.status),
    index("idx_referral_fraud_events_severity").on(table.severity),
    index("idx_referral_fraud_events_risk").on(table.riskScore),
  ],
);

// Analytics and reporting tables
export const analyticsMetricTypeEnum = pgEnum("analytics_metric_type", [
  "clicks",
  "conversions",
  "earnings",
  "conversion_rate",
  "lifetime_value",
  "geographic",
  "device",
  "source",
]);
export const analyticsTimeframeEnum = pgEnum("analytics_timeframe", [
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year",
]);

export const referralAnalytics = pgTable(
  "referral_analytics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Time dimension
    timeframe: analyticsTimeframeEnum("timeframe").notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Dimension keys
    referrerId: varchar("referrer_id").references(() => accounts.id),
    campaignId: varchar("campaign_id").references(() => referralCampaigns.id),
    referralCodeId: varchar("referral_code_id").references(
      () => referralCodes.id,
    ),

    // Geographic dimensions
    country: varchar("country"),
    region: varchar("region"),
    city: varchar("city"),

    // Technical dimensions
    deviceType: varchar("device_type"), // mobile, desktop, tablet
    browserType: varchar("browser_type"),
    sourceType: varchar("source_type"), // social, email, direct, etc.

    // Metrics
    metricType: analyticsMetricTypeEnum("metric_type").notNull(),
    metricValue: decimal("metric_value", { precision: 15, scale: 4 }).notNull(),
    metricCount: integer("metric_count").default(0),

    // Additional data
    metadata: jsonb("metadata").default({}),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_referral_analytics_timeframe").on(
      table.timeframe,
      table.periodStart,
    ),
    index("idx_referral_analytics_referrer").on(table.referrerId),
    index("idx_referral_analytics_campaign").on(table.campaignId),
    index("idx_referral_analytics_metric").on(table.metricType),
    index("idx_referral_analytics_geography").on(table.country, table.region),
    index("idx_referral_analytics_device").on(table.deviceType),
  ],
);

// ===== REFERRAL SYSTEM INSERT SCHEMAS =====

// Referral codes
export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true,
  currentUses: true,
  clickCount: true,
  conversionCount: true,
  totalEarnings: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type ReferralCode = typeof referralCodes.$inferSelect;

// Referral campaigns
export const insertReferralCampaignSchema = createInsertSchema(
  referralCampaigns,
).omit({
  id: true,
  participantCount: true,
  totalRewardsIssued: true,
  conversionRate: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReferralCampaign = z.infer<
  typeof insertReferralCampaignSchema
>;
export type ReferralCampaign = typeof referralCampaigns.$inferSelect;

// Referral tracking
export const insertReferralTrackingSchema = createInsertSchema(
  referralTracking,
).omit({
  id: true,
  createdAt: true,
});
export type InsertReferralTracking = z.infer<
  typeof insertReferralTrackingSchema
>;
export type ReferralTracking = typeof referralTracking.$inferSelect;

// Referral relationships
export const insertReferralRelationshipSchema = createInsertSchema(
  referralRelationships,
).omit({
  id: true,
  totalEarnings: true,
  lifetimeValue: true,
  fraudScore: true,
  isVerified: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReferralRelationship = z.infer<
  typeof insertReferralRelationshipSchema
>;
export type ReferralRelationship = typeof referralRelationships.$inferSelect;

// Referral earnings
export const insertReferralEarningsSchema = createInsertSchema(
  referralEarnings,
).omit({
  id: true,
  paidAt: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReferralEarnings = z.infer<
  typeof insertReferralEarningsSchema
>;
export type ReferralEarnings = typeof referralEarnings.$inferSelect;

// Affiliate profiles
export const insertAffiliateProfileSchema = createInsertSchema(
  affiliateProfiles,
).omit({
  id: true,
  totalClicks: true,
  totalConversions: true,
  totalEarnings: true,
  conversionRate: true,
  averageOrderValue: true,
  lifetimeClicks: true,
  lifetimeConversions: true,
  lifetimeEarnings: true,
  periodClicks: true,
  periodConversions: true,
  periodEarnings: true,
  currentStreak: true,
  longestStreak: true,
  approvedAt: true,
  rejectedAt: true,
  lastActivityAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAffiliateProfile = z.infer<
  typeof insertAffiliateProfileSchema
>;
export type AffiliateProfile = typeof affiliateProfiles.$inferSelect;

// Referral achievements
export const insertReferralAchievementSchema = createInsertSchema(
  referralAchievements,
).omit({
  id: true,
  currentProgress: true,
  progressPercentage: true,
  unlockedAt: true,
  claimedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReferralAchievement = z.infer<
  typeof insertReferralAchievementSchema
>;
export type ReferralAchievement = typeof referralAchievements.$inferSelect;

// Referral fraud events
export const insertReferralFraudEventSchema = createInsertSchema(
  referralFraudEvents,
).omit({
  id: true,
  investigatedAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReferralFraudEvent = z.infer<
  typeof insertReferralFraudEventSchema
>;
export type ReferralFraudEvent = typeof referralFraudEvents.$inferSelect;

// Referral analytics
export const insertReferralAnalyticsSchema = createInsertSchema(
  referralAnalytics,
).omit({
  id: true,
  createdAt: true,
});
export type InsertReferralAnalytics = z.infer<
  typeof insertReferralAnalyticsSchema
>;
export type ReferralAnalytics = typeof referralAnalytics.$inferSelect;

// ===== FANZTRUST™ FINANCIAL LEDGER CORE =====
// Comprehensive financial ecosystem: wallets, ledger, credit, tokens, cards

// Wallet statuses and types
export const walletStatusEnum = pgEnum("wallet_status", [
  "active",
  "frozen",
  "suspended",
  "closed",
]);
export const walletTypeEnum = pgEnum("wallet_type", [
  "standard",
  "business",
  "creator",
  "escrow",
  "rewards",
]);

// FanzWallet - User digital wallets with multi-currency support
export const fanzWallets = pgTable(
  "fanz_wallets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: walletTypeEnum("type").default("standard").notNull(),
    status: walletStatusEnum("status").default("active").notNull(),
    
    // Balances in cents
    availableBalanceCents: bigint("available_balance_cents", { mode: "number" }).default(0),
    pendingBalanceCents: bigint("pending_balance_cents", { mode: "number" }).default(0),
    heldBalanceCents: bigint("held_balance_cents", { mode: "number" }).default(0),
    totalBalanceCents: bigint("total_balance_cents", { mode: "number" }).default(0),
    
    currency: varchar("currency").default("USD"),
    
    // Limits and compliance
    dailyLimitCents: bigint("daily_limit_cents", { mode: "number" }).default(100000000),
    monthlyLimitCents: bigint("monthly_limit_cents", { mode: "number" }).default(500000000),
    lifetimeLimitCents: bigint("lifetime_limit_cents", { mode: "number" }),
    
    // Metadata
    metadata: jsonb("metadata").default({}),
    freezeReason: text("freeze_reason"),
    frozenAt: timestamp("frozen_at"),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_fanz_wallets_user").on(table.userId),
    index("idx_fanz_wallets_status").on(table.status),
    index("idx_fanz_wallets_type").on(table.type),
  ],
);

// Ledger entry types
export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "debit",
  "credit",
]);
export const ledgerTransactionTypeEnum = pgEnum("ledger_transaction_type", [
  "payment",
  "refund",
  "chargeback",
  "transfer",
  "fee",
  "payout",
  "deposit",
  "withdrawal",
  "reward",
  "credit_issued",
  "credit_repaid",
  "token_purchase",
  "token_redemption",
]);

// FanzLedger - Double-entry transaction ledger
export const fanzLedger = pgTable(
  "fanz_ledger",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // Transaction linking
    transactionId: varchar("transaction_id").notNull().unique(),
    parentTransactionId: varchar("parent_transaction_id"),
    
    // Wallet and user context
    walletId: varchar("wallet_id")
      .notNull()
      .references(() => fanzWallets.id),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    
    // Entry details
    entryType: ledgerEntryTypeEnum("entry_type").notNull(),
    transactionType: ledgerTransactionTypeEnum("transaction_type").notNull(),
    
    // Amounts in cents
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    balanceAfterCents: bigint("balance_after_cents", { mode: "number" }).notNull(),
    
    currency: varchar("currency").default("USD"),
    
    // References
    referenceType: varchar("reference_type"), // payment, subscription, tip, etc.
    referenceId: varchar("reference_id"),
    
    // Metadata
    description: text("description"),
    metadata: jsonb("metadata").default({}),
    
    // Audit
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_fanz_ledger_wallet").on(table.walletId),
    index("idx_fanz_ledger_user").on(table.userId),
    index("idx_fanz_ledger_transaction").on(table.transactionId),
    index("idx_fanz_ledger_type").on(table.transactionType),
    index("idx_fanz_ledger_created").on(table.createdAt.desc()),
  ],
);

// Credit line statuses
export const creditLineStatusEnum = pgEnum("credit_line_status", [
  "pending",
  "active",
  "frozen",
  "defaulted",
  "closed",
]);

// FanzCredit - Credit lines and lending
export const fanzCreditLines = pgTable(
  "fanz_credit_lines",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    status: creditLineStatusEnum("status").default("pending").notNull(),
    
    // Credit limits in cents
    creditLimitCents: bigint("credit_limit_cents", { mode: "number" }).notNull(),
    availableCreditCents: bigint("available_credit_cents", { mode: "number" }).notNull(),
    usedCreditCents: bigint("used_credit_cents", { mode: "number" }).default(0),
    
    // Interest and fees
    interestRateBps: integer("interest_rate_bps").default(0), // basis points (100 = 1%)
    lateFeePercentBps: integer("late_fee_percent_bps").default(500), // 5%
    
    // Trust scoring
    trustScore: integer("trust_score").default(0),
    riskTier: varchar("risk_tier").default("standard"), // low, standard, high
    
    // Payment terms
    paymentDueDays: integer("payment_due_days").default(30),
    gracePeriodDays: integer("grace_period_days").default(7),
    
    // Collateral (optional)
    collateralType: varchar("collateral_type"), // fan_stake, creator_revenue, token_pledge
    collateralValueCents: bigint("collateral_value_cents", { mode: "number" }),
    collateralMetadata: jsonb("collateral_metadata").default({}),
    
    // Lifecycle
    approvedAt: timestamp("approved_at"),
    approvedBy: varchar("approved_by").references(() => users.id),
    closedAt: timestamp("closed_at"),
    closedReason: text("closed_reason"),
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_fanz_credit_lines_user").on(table.userId),
    index("idx_fanz_credit_lines_status").on(table.status),
    index("idx_fanz_credit_lines_trust_score").on(table.trustScore),
  ],
);

// Token types
export const tokenTypeEnum = pgEnum("token_type", [
  "fanzcoin",
  "fanztoken",
  "loyalty",
  "reward",
  "utility",
]);

// FanzToken - Platform token economy
export const fanzTokens = pgTable(
  "fanz_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    tokenType: tokenTypeEnum("token_type").notNull(),
    
    // Balance
    balance: bigint("balance", { mode: "number" }).default(0),
    lockedBalance: bigint("locked_balance", { mode: "number" }).default(0),
    
    // Value mapping (cents per token)
    valueCentsPerToken: integer("value_cents_per_token").default(100), // 1 token = $1 default
    
    // Rewards multipliers
    rewardsMultiplier: decimal("rewards_multiplier", { precision: 5, scale: 2 }).default("1.00"),
    
    // Lifecycle
    expiresAt: timestamp("expires_at"),
    lastTransactionAt: timestamp("last_transaction_at"),
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_fanz_tokens_user").on(table.userId),
    index("idx_fanz_tokens_type").on(table.tokenType),
    unique().on(table.userId, table.tokenType),
  ],
);

// Card statuses
export const cardStatusEnum = pgEnum("card_status", [
  "pending",
  "active",
  "frozen",
  "cancelled",
  "expired",
]);

// FanzCard - Virtual debit cards
export const fanzCards = pgTable(
  "fanz_cards",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    walletId: varchar("wallet_id")
      .notNull()
      .references(() => fanzWallets.id),
    
    // Card details (encrypted)
    cardNumberHash: varchar("card_number_hash").notNull(),
    last4: varchar("last_4").notNull(),
    expiryMonth: integer("expiry_month").notNull(),
    expiryYear: integer("expiry_year").notNull(),
    cvvHash: varchar("cvv_hash").notNull(),
    
    // Card branding
    cardholderName: varchar("cardholder_name").notNull(),
    cardType: varchar("card_type").default("virtual"), // virtual, physical
    cardBrand: varchar("card_brand").default("fanzcard"),
    
    status: cardStatusEnum("status").default("pending").notNull(),
    
    // Limits and controls
    dailySpendLimitCents: bigint("daily_spend_limit_cents", { mode: "number" }),
    monthlySpendLimitCents: bigint("monthly_spend_limit_cents", { mode: "number" }),
    perTransactionLimitCents: bigint("per_transaction_limit_cents", { mode: "number" }),
    
    // Usage tracking
    totalSpentCents: bigint("total_spent_cents", { mode: "number" }).default(0),
    totalTransactions: integer("total_transactions").default(0),
    lastUsedAt: timestamp("last_used_at"),
    
    // Controls
    allowedMerchantCategories: text("allowed_merchant_categories").array(),
    blockedMerchantCategories: text("blocked_merchant_categories").array(),
    allowedCountries: text("allowed_countries").array(),
    
    // Provider integration
    providerCardId: varchar("provider_card_id"),
    providerMetadata: jsonb("provider_metadata").default({}),
    
    metadata: jsonb("metadata").default({}),
    activatedAt: timestamp("activated_at"),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_fanz_cards_user").on(table.userId),
    index("idx_fanz_cards_wallet").on(table.walletId),
    index("idx_fanz_cards_status").on(table.status),
    index("idx_fanz_cards_last4").on(table.last4),
  ],
);

// Quest status types
export const questStatusEnum = pgEnum("quest_status", [
  "draft",
  "active",
  "completed",
  "failed",
  "cancelled",
]);

// Quest types
export const questTypeEnum = pgEnum("quest_type", [
  "revenue_goal",
  "fan_contribution",
  "content_unlock",
  "collaborative_project",
]);

// Revenue Quests - AI-powered gamified revenue goals
export const revenueQuests = pgTable(
  "revenue_quests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Quest details
    title: varchar("title").notNull(),
    description: text("description"),
    questType: questTypeEnum("quest_type").notNull(),
    status: questStatusEnum("status").default("draft").notNull(),
    
    // Financial goals
    goalAmountCents: bigint("goal_amount_cents", { mode: "number" }).notNull(),
    currentAmountCents: bigint("current_amount_cents", { mode: "number" }).default(0),
    minContributionCents: bigint("min_contribution_cents", { mode: "number" }).default(100), // $1 minimum
    
    // Timing
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    
    // Rewards and unlocks
    rewardType: varchar("reward_type"), // content, nft, experience, exclusive_access
    rewardMetadata: jsonb("reward_metadata").default({}), // content URLs, NFT details, etc.
    contentUnlockId: varchar("content_unlock_id"), // reference to unlockable content
    
    // Revenue sharing for contributors
    contributorSharePercentage: integer("contributor_share_percentage").default(0), // 0-100
    
    // AI recommendations
    aiSuggestedGoal: bigint("ai_suggested_goal", { mode: "number" }),
    aiConfidenceScore: integer("ai_confidence_score"), // 0-100
    aiInsights: jsonb("ai_insights").default({}),
    
    // Stats
    totalContributors: integer("total_contributors").default(0),
    completionPercentage: integer("completion_percentage").default(0),
    rewardsDistributed: boolean("rewards_distributed").default(false),
    
    metadata: jsonb("metadata").default({}),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_revenue_quests_creator").on(table.creatorId),
    index("idx_revenue_quests_status").on(table.status),
    index("idx_revenue_quests_type").on(table.questType),
    index("idx_revenue_quests_end_date").on(table.endDate),
  ],
);

// Quest participants - fan underwriting and contributions
export const questParticipants = pgTable(
  "quest_participants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    questId: varchar("quest_id")
      .notNull()
      .references(() => revenueQuests.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Contribution details
    contributedAmountCents: bigint("contributed_amount_cents", { mode: "number" }).notNull(),
    sharePercentage: decimal("share_percentage", { precision: 5, scale: 2 }), // 0.00-100.00
    
    // Earnings from quest
    earnedAmountCents: bigint("earned_amount_cents", { mode: "number" }).default(0),
    
    // Underwriting info
    isUnderwriter: boolean("is_underwriter").default(false), // early supporter bonus
    underwriterBonusPercentage: integer("underwriter_bonus_percentage").default(0),
    
    // Transaction reference
    transactionId: varchar("transaction_id"), // link to FanzLedger transaction
    
    metadata: jsonb("metadata").default({}),
    contributedAt: timestamp("contributed_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_quest_participants_quest").on(table.questId),
    index("idx_quest_participants_user").on(table.userId),
    unique().on(table.questId, table.userId),
  ],
);

// Quest milestones and unlocks
export const questMilestones = pgTable(
  "quest_milestones",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    questId: varchar("quest_id")
      .notNull()
      .references(() => revenueQuests.id, { onDelete: "cascade" }),
    
    // Milestone details
    title: varchar("title").notNull(),
    targetAmountCents: bigint("target_amount_cents", { mode: "number" }).notNull(),
    
    // Unlock details
    unlockType: varchar("unlock_type"), // content, badge, bonus, feature
    unlockData: jsonb("unlock_data").default({}),
    
    // Status
    isReached: boolean("is_reached").default(false),
    reachedAt: timestamp("reached_at"),
    
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_quest_milestones_quest").on(table.questId),
  ],
);

// Revenue split types
export const revenueSplitTypeEnum = pgEnum("revenue_split_type", [
  "collaborative",
  "affiliate",
  "referral",
  "platform_fee",
  "royalty",
]);

// FanzRevenue - Revenue sharing and collaborative payouts
export const fanzRevenueShares = pgTable(
  "fanz_revenue_shares",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // Content/transaction reference
    referenceType: varchar("reference_type").notNull(), // post, subscription, product, etc.
    referenceId: varchar("reference_id").notNull(),
    
    splitType: revenueSplitTypeEnum("split_type").notNull(),
    
    // Revenue details
    totalRevenueCents: bigint("total_revenue_cents", { mode: "number" }).notNull(),
    
    // Split configuration
    splits: jsonb("splits").notNull(), // [{ userId, percentage, amountCents }]
    
    // Status
    status: varchar("status").default("pending"), // pending, processing, completed, failed
    processedAt: timestamp("processed_at"),
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_fanz_revenue_shares_reference").on(table.referenceType, table.referenceId),
    index("idx_fanz_revenue_shares_type").on(table.splitType),
    index("idx_fanz_revenue_shares_status").on(table.status),
  ],
);

// ===== TRUST TIERING & REPUTATION SYSTEM =====
// FanzTrust proof graph, reputation scoring, and automated dispute resolution

// Trust tier levels
export const trustTierEnum = pgEnum("trust_tier", [
  "unverified",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]);

// Proof submission status
export const proofStatusEnum = pgEnum("proof_status", [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "expired",
]);

// Dispute case status
export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "investigating",
  "resolved",
  "closed",
  "escalated",
]);

// Trust scores - user reputation and tier assignments
export const trustScores = pgTable(
  "trust_scores",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Trust metrics
    currentTier: trustTierEnum("current_tier").default("unverified").notNull(),
    scorePoints: integer("score_points").default(0).notNull(), // 0-10000
    
    // Proof verification counts
    proofsSubmitted: integer("proofs_submitted").default(0),
    proofsApproved: integer("proofs_approved").default(0),
    proofsRejected: integer("proofs_rejected").default(0),
    
    // Behavioral metrics
    transactionCount: integer("transaction_count").default(0),
    totalTransactionVolumeCents: bigint("total_transaction_volume_cents", { mode: "number" }).default(0),
    successfulDisputesWon: integer("successful_disputes_won").default(0),
    disputesLost: integer("disputes_lost").default(0),
    
    // Platform activity
    accountAgeDays: integer("account_age_days").default(0),
    consecutiveGoodStandingDays: integer("consecutive_good_standing_days").default(0),
    
    // Score modifiers
    bonusPoints: integer("bonus_points").default(0), // manual admin adjustments
    penaltyPoints: integer("penalty_points").default(0),
    
    // Status
    lastCalculatedAt: timestamp("last_calculated_at"),
    nextReviewAt: timestamp("next_review_at"),
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_trust_scores_user").on(table.userId),
    index("idx_trust_scores_tier").on(table.currentTier),
    index("idx_trust_scores_points").on(table.scorePoints),
  ],
);

// Trust proofs - submitted evidence for trust verification
export const trustProofs = pgTable(
  "trust_proofs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Proof details
    proofType: varchar("proof_type").notNull(), // id_verification, address, payment_history, social_media, etc.
    status: proofStatusEnum("status").default("pending").notNull(),
    
    // Document references
    documentUrls: text("document_urls").array().default([]), // uploaded proof documents
    documentHashes: text("document_hashes").array().default([]), // SHA-256 hashes for integrity
    
    // Verification details
    verifiedBy: varchar("verified_by").references(() => users.id), // admin/reviewer
    verifiedAt: timestamp("verified_at"),
    rejectionReason: text("rejection_reason"),
    
    // Expiry (for time-sensitive proofs)
    expiresAt: timestamp("expires_at"),
    
    // Score impact
    scorePointsAwarded: integer("score_points_awarded").default(0),
    
    metadata: jsonb("metadata").default({}),
    submittedAt: timestamp("submitted_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_trust_proofs_user").on(table.userId),
    index("idx_trust_proofs_status").on(table.status),
    index("idx_trust_proofs_type").on(table.proofType),
    index("idx_trust_proofs_verified_by").on(table.verifiedBy),
  ],
);

// Dispute cases - automated resolution and case management
export const disputeCases = pgTable(
  "dispute_cases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // Parties involved
    filedBy: varchar("filed_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    againstUser: varchar("against_user")
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Dispute details
    disputeType: varchar("dispute_type").notNull(), // transaction, content, harassment, fraud, etc.
    status: disputeStatusEnum("status").default("open").notNull(),
    
    // Case information
    title: varchar("title").notNull(),
    description: text("description").notNull(),
    
    // Evidence and references
    evidenceUrls: text("evidence_urls").array().default([]),
    relatedTransactionIds: text("related_transaction_ids").array().default([]),
    relatedContentIds: text("related_content_ids").array().default([]),
    
    // Resolution
    assignedTo: varchar("assigned_to").references(() => users.id), // admin/mediator
    resolution: text("resolution"),
    resolvedAt: timestamp("resolved_at"),
    
    // Outcome
    rulingInFavorOf: varchar("ruling_in_favor_of").references(() => users.id),
    compensationAmountCents: bigint("compensation_amount_cents", { mode: "number" }),
    
    // AI-assisted resolution
    aiRecommendedAction: varchar("ai_recommended_action"),
    aiConfidenceScore: integer("ai_confidence_score"), // 0-100
    aiReasoning: jsonb("ai_reasoning").default({}),
    
    // Automation
    autoResolved: boolean("auto_resolved").default(false),
    escalatedToHuman: boolean("escalated_to_human").default(false),
    
    metadata: jsonb("metadata").default({}),
    filedAt: timestamp("filed_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_dispute_cases_filed_by").on(table.filedBy),
    index("idx_dispute_cases_against").on(table.againstUser),
    index("idx_dispute_cases_status").on(table.status),
    index("idx_dispute_cases_type").on(table.disputeType),
    index("idx_dispute_cases_assigned").on(table.assignedTo),
  ],
);

// Insert schemas
export const insertFanzWalletSchema = createInsertSchema(fanzWallets).omit({
  id: true,
  totalBalanceCents: true,
  frozenAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFanzLedgerSchema = createInsertSchema(fanzLedger).omit({
  id: true,
  createdAt: true,
});

export const insertFanzCreditLineSchema = createInsertSchema(fanzCreditLines).omit({
  id: true,
  availableCreditCents: true,
  usedCreditCents: true,
  approvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFanzTokenSchema = createInsertSchema(fanzTokens).omit({
  id: true,
  lastTransactionAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFanzCardSchema = createInsertSchema(fanzCards).omit({
  id: true,
  totalSpentCents: true,
  totalTransactions: true,
  lastUsedAt: true,
  activatedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFanzRevenueShareSchema = createInsertSchema(fanzRevenueShares).omit({
  id: true,
  processedAt: true,
  createdAt: true,
});

// Types
export type FanzWallet = typeof fanzWallets.$inferSelect;
export type InsertFanzWallet = z.infer<typeof insertFanzWalletSchema>;
export type FanzLedger = typeof fanzLedger.$inferSelect;
export type InsertFanzLedger = z.infer<typeof insertFanzLedgerSchema>;
export type FanzCreditLine = typeof fanzCreditLines.$inferSelect;
export type InsertFanzCreditLine = z.infer<typeof insertFanzCreditLineSchema>;
export type FanzToken = typeof fanzTokens.$inferSelect;
export type InsertFanzToken = z.infer<typeof insertFanzTokenSchema>;
export type FanzCard = typeof fanzCards.$inferSelect;
export type InsertFanzCard = z.infer<typeof insertFanzCardSchema>;
export type FanzRevenueShare = typeof fanzRevenueShares.$inferSelect;
export type InsertFanzRevenueShare = z.infer<typeof insertFanzRevenueShareSchema>;

// Quest schemas
export const insertRevenueQuestSchema = createInsertSchema(revenueQuests).omit({
  id: true,
  currentAmountCents: true,
  totalContributors: true,
  completionPercentage: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestParticipantSchema = createInsertSchema(questParticipants).omit({
  id: true,
  earnedAmountCents: true,
  contributedAt: true,
  createdAt: true,
});

export const insertQuestMilestoneSchema = createInsertSchema(questMilestones).omit({
  id: true,
  isReached: true,
  reachedAt: true,
  createdAt: true,
});

// Quest types
export type RevenueQuest = typeof revenueQuests.$inferSelect;
export type InsertRevenueQuest = z.infer<typeof insertRevenueQuestSchema>;
export type QuestParticipant = typeof questParticipants.$inferSelect;
export type InsertQuestParticipant = z.infer<typeof insertQuestParticipantSchema>;
export type QuestMilestone = typeof questMilestones.$inferSelect;
export type InsertQuestMilestone = z.infer<typeof insertQuestMilestoneSchema>;

// Trust scoring schemas
export const insertTrustScoreSchema = createInsertSchema(trustScores).omit({
  id: true,
  proofsSubmitted: true,
  proofsApproved: true,
  proofsRejected: true,
  transactionCount: true,
  totalTransactionVolumeCents: true,
  successfulDisputesWon: true,
  disputesLost: true,
  accountAgeDays: true,
  consecutiveGoodStandingDays: true,
  lastCalculatedAt: true,
  nextReviewAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrustProofSchema = createInsertSchema(trustProofs).omit({
  id: true,
  verifiedBy: true,
  verifiedAt: true,
  rejectionReason: true,
  scorePointsAwarded: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDisputeCaseSchema = createInsertSchema(disputeCases).omit({
  id: true,
  assignedTo: true,
  resolution: true,
  resolvedAt: true,
  rulingInFavorOf: true,
  compensationAmountCents: true,
  aiRecommendedAction: true,
  aiConfidenceScore: true,
  aiReasoning: true,
  autoResolved: true,
  escalatedToHuman: true,
  filedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Trust scoring types
export type TrustScore = typeof trustScores.$inferSelect;
export type InsertTrustScore = z.infer<typeof insertTrustScoreSchema>;
export type TrustProof = typeof trustProofs.$inferSelect;
export type InsertTrustProof = z.infer<typeof insertTrustProofSchema>;
export type DisputeCase = typeof disputeCases.$inferSelect;
export type InsertDisputeCase = z.infer<typeof insertDisputeCaseSchema>;

// ===== MIXED-REALITY LIVE EVENTS =====
// Immersive virtual meetups with tipping, private shows, and NFT souvenirs

export const eventTypeEnum = pgEnum("event_type", [
  "public_meetup",
  "private_show",
  "vip_experience",
  "fan_meetup",
  "exclusive_stream",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "scheduled",
  "live",
  "ended",
  "cancelled",
]);

export const eventAccessEnum = pgEnum("event_access", [
  "free",
  "ticketed",
  "subscription_only",
  "tier_gated",
]);

// Live events created by creators
export const liveEvents = pgTable(
  "live_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    creatorId: varchar("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Event details
    title: varchar("title").notNull(),
    description: text("description"),
    eventType: eventTypeEnum("event_type").notNull(),
    status: eventStatusEnum("status").default("scheduled").notNull(),
    accessType: eventAccessEnum("access_type").default("free").notNull(),
    
    // Scheduling
    scheduledStartAt: timestamp("scheduled_start_at").notNull(),
    scheduledEndAt: timestamp("scheduled_end_at").notNull(),
    actualStartAt: timestamp("actual_start_at"),
    actualEndAt: timestamp("actual_end_at"),
    
    // Ticketing
    ticketPriceCents: bigint("ticket_price_cents", { mode: "number" }).default(0),
    maxAttendees: integer("max_attendees"),
    
    // Mixed-reality features
    virtualRoomUrl: varchar("virtual_room_url"), // 3D space URL
    backgroundAssetUrl: varchar("background_asset_url"),
    avatarEnabled: boolean("avatar_enabled").default(true),
    spatialAudioEnabled: boolean("spatial_audio_enabled").default(true),
    
    // NFT souvenirs
    nftSouvenirEnabled: boolean("nft_souvenir_enabled").default(false),
    nftSouvenirName: varchar("nft_souvenir_name"),
    nftSouvenirDescription: text("nft_souvenir_description"),
    nftSouvenirImageUrl: varchar("nft_souvenir_image_url"),
    
    // Engagement tracking
    totalRevenueCents: bigint("total_revenue_cents", { mode: "number" }).default(0),
    totalTipsCents: bigint("total_tips_cents", { mode: "number" }).default(0),
    totalAttendees: integer("total_attendees").default(0),
    peakConcurrentViewers: integer("peak_concurrent_viewers").default(0),
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_live_events_creator").on(table.creatorId),
    index("idx_live_events_status").on(table.status),
    index("idx_live_events_type").on(table.eventType),
    index("idx_live_events_scheduled_start").on(table.scheduledStartAt),
  ],
);

// Event tickets purchased by fans
export const eventTickets = pgTable(
  "event_tickets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: varchar("event_id")
      .notNull()
      .references(() => liveEvents.id, { onDelete: "cascade" }),
    fanId: varchar("fan_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Purchase details
    pricePaidCents: bigint("price_paid_cents", { mode: "number" }).notNull(),
    paymentMethod: varchar("payment_method"), // fanzwallet, card, crypto
    transactionId: varchar("transaction_id").references(() => fanzLedger.id),
    
    // Ticket status
    purchasedAt: timestamp("purchased_at").defaultNow(),
    usedAt: timestamp("used_at"),
    refundedAt: timestamp("refunded_at"),
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique().on(table.eventId, table.fanId),
    index("idx_event_tickets_event").on(table.eventId),
    index("idx_event_tickets_fan").on(table.fanId),
  ],
);

// Real-time event attendance tracking
export const eventAttendance = pgTable(
  "event_attendance",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: varchar("event_id")
      .notNull()
      .references(() => liveEvents.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Attendance tracking
    joinedAt: timestamp("joined_at").defaultNow(),
    leftAt: timestamp("left_at"),
    durationSeconds: integer("duration_seconds").default(0),
    
    // Mixed-reality presence
    avatarUrl: varchar("avatar_url"),
    positionX: decimal("position_x"),
    positionY: decimal("position_y"),
    positionZ: decimal("position_z"),
    isActive: boolean("is_active").default(true),
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_event_attendance_event").on(table.eventId),
    index("idx_event_attendance_user").on(table.userId),
    index("idx_event_attendance_active").on(table.isActive),
  ],
);

// Live tips during events
export const eventTips = pgTable(
  "event_tips",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: varchar("event_id")
      .notNull()
      .references(() => liveEvents.id, { onDelete: "cascade" }),
    fromUserId: varchar("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: varchar("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Tip details
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    message: text("message"),
    isAnonymous: boolean("is_anonymous").default(false),
    
    // Transaction
    transactionId: varchar("transaction_id").references(() => fanzLedger.id),
    
    // Display options
    showOnScreen: boolean("show_on_screen").default(true), // Display in live event UI
    highlightColor: varchar("highlight_color"),
    
    tippedAt: timestamp("tipped_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_event_tips_event").on(table.eventId),
    index("idx_event_tips_from").on(table.fromUserId),
    index("idx_event_tips_to").on(table.toUserId),
  ],
);

// NFT souvenirs minted for event attendees
// ============================================================
// EMAIL/PASSWORD AUTHENTICATION SYSTEM
// ============================================================

// Email verification tokens
export const authEmailVerificationTokens = pgTable(
  "auth_email_verification_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountId: varchar("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash").notNull().unique(),
    purpose: varchar("purpose").notNull().default("verify_email"),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_email_verify_token").on(table.tokenHash),
    index("idx_email_verify_account").on(table.accountId),
    index("idx_email_verify_expires").on(table.expiresAt),
  ]
);

// Password reset tokens
export const authPasswordResetTokens = pgTable(
  "auth_password_reset_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountId: varchar("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash").notNull().unique(),
    purpose: varchar("purpose").notNull().default("reset_password"),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_password_reset_token").on(table.tokenHash),
    index("idx_password_reset_account").on(table.accountId),
    index("idx_password_reset_expires").on(table.expiresAt),
  ]
);

// Email recovery tokens (for forgot email flow)
export const authEmailRecoveryTokens = pgTable(
  "auth_email_recovery_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountId: varchar("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash").notNull().unique(),
    purpose: varchar("purpose").notNull().default("recover_email"),
    recoveryHint: jsonb("recovery_hint"), // phone, security question, etc.
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_email_recovery_token").on(table.tokenHash),
    index("idx_email_recovery_account").on(table.accountId),
    index("idx_email_recovery_expires").on(table.expiresAt),
  ]
);

// Login attempts throttling (brute force protection)
export const authLoginAttempts = pgTable(
  "auth_login_attempts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountId: varchar("account_id"), // nullable - track before account is identified
    ipAddress: varchar("ip_address").notNull(),
    email: varchar("email"), // for tracking failed attempts
    windowStart: timestamp("window_start").notNull(),
    attemptCount: integer("attempt_count").default(1).notNull(),
    blockedUntil: timestamp("blocked_until"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_login_attempts_ip").on(table.ipAddress),
    index("idx_login_attempts_account").on(table.accountId),
    index("idx_login_attempts_email").on(table.email),
    index("idx_login_attempts_blocked").on(table.blockedUntil),
  ]
);

export const eventNftSouvenirs = pgTable(
  "event_nft_souvenirs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: varchar("event_id")
      .notNull()
      .references(() => liveEvents.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // NFT details
    tokenId: varchar("token_id").unique(), // Blockchain token ID
    name: varchar("name").notNull(),
    description: text("description"),
    imageUrl: varchar("image_url").notNull(),
    
    // Attributes
    attributes: jsonb("attributes").default({}), // NFT metadata
    rarity: varchar("rarity"), // common, rare, epic, legendary
    serialNumber: integer("serial_number"), // 1 of 100
    
    // Blockchain info (blockchain-agnostic)
    chainId: varchar("chain_id"), // ethereum, polygon, etc.
    contractAddress: varchar("contract_address"),
    transactionHash: varchar("transaction_hash"),
    
    // Minting
    mintedAt: timestamp("minted_at").defaultNow(),
    claimedAt: timestamp("claimed_at"),
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique().on(table.eventId, table.userId),
    index("idx_event_nft_event").on(table.eventId),
    index("idx_event_nft_user").on(table.userId),
    index("idx_event_nft_token").on(table.tokenId),
  ],
);

// Insert schemas
export const insertLiveEventSchema = createInsertSchema(liveEvents).omit({
  id: true,
  actualStartAt: true,
  actualEndAt: true,
  totalRevenueCents: true,
  totalTipsCents: true,
  totalAttendees: true,
  peakConcurrentViewers: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventTicketSchema = createInsertSchema(eventTickets).omit({
  id: true,
  usedAt: true,
  refundedAt: true,
  purchasedAt: true,
  createdAt: true,
});

export const insertEventAttendanceSchema = createInsertSchema(eventAttendance).omit({
  id: true,
  leftAt: true,
  durationSeconds: true,
  joinedAt: true,
  createdAt: true,
});

export const insertEventTipSchema = createInsertSchema(eventTips).omit({
  id: true,
  tippedAt: true,
  createdAt: true,
});

export const insertEventNftSouvenirSchema = createInsertSchema(eventNftSouvenirs).omit({
  id: true,
  mintedAt: true,
  claimedAt: true,
  createdAt: true,
});

// Types
export type LiveEvent = typeof liveEvents.$inferSelect;
export type InsertLiveEvent = z.infer<typeof insertLiveEventSchema>;
export type EventTicket = typeof eventTickets.$inferSelect;
export type InsertEventTicket = z.infer<typeof insertEventTicketSchema>;
export type EventAttendance = typeof eventAttendance.$inferSelect;
export type InsertEventAttendance = z.infer<typeof insertEventAttendanceSchema>;
export type EventTip = typeof eventTips.$inferSelect;
export type InsertEventTip = z.infer<typeof insertEventTipSchema>;
export type EventNftSouvenir = typeof eventNftSouvenirs.$inferSelect;
export type InsertEventNftSouvenir = z.infer<typeof insertEventNftSouvenirSchema>;

// ===== AI VOICE CLONING SYSTEM =====
// Voice profiles for personalized messages and DMs
export const voiceProfileStatusEnum = pgEnum("voice_profile_status", [
  "pending", // Uploading/processing
  "cloning", // Cloning in progress
  "active", // Ready to use
  "failed", // Cloning failed
  "disabled", // Manually disabled
]);

export const voiceProfiles = pgTable(
  "voice_profiles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(), // "Professional Voice", "Casual Voice", etc.
    description: text("description"),
    
    // ElevenLabs Integration
    voiceId: varchar("voice_id"), // ElevenLabs voice ID (null until cloned)
    provider: varchar("provider").default("elevenlabs").notNull(), // Future-proof for multiple providers
    
    // Audio Samples
    audioSampleUrls: text("audio_sample_urls").array().default([]), // S3 URLs of training samples
    sampleDuration: integer("sample_duration"), // Total duration in seconds
    
    // Status & Metadata
    status: voiceProfileStatusEnum("status").default("pending").notNull(),
    errorMessage: text("error_message"), // If cloning failed
    quality: integer("quality"), // 1-10 quality score from ElevenLabs
    
    // Voice Settings
    stability: decimal("stability", { precision: 3, scale: 2 }).default("0.75"), // 0.0-1.0
    similarityBoost: decimal("similarity_boost", { precision: 3, scale: 2 }).default("0.75"), // 0.0-1.0
    style: decimal("style", { precision: 3, scale: 2 }).default("0.0"), // 0.0-1.0 (emotion/expressiveness)
    useSpeakerBoost: boolean("use_speaker_boost").default(true),
    
    metadata: jsonb("metadata").default({}), // Additional provider-specific data
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_voice_profiles_user").on(table.userId),
    index("idx_voice_profiles_status").on(table.status),
    index("idx_voice_profiles_voice_id").on(table.voiceId),
  ]
);

// Generated voice messages for fans
export const voiceMessageStatusEnum = pgEnum("voice_message_status", [
  "pending", // Queued for generation
  "generating", // TTS in progress
  "completed", // Ready to send
  "failed", // Generation failed
  "sent", // Delivered to recipient
]);

export const voiceMessages = pgTable(
  "voice_messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    voiceProfileId: varchar("voice_profile_id")
      .notNull()
      .references(() => voiceProfiles.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: varchar("recipient_id")
      .references(() => users.id, { onDelete: "set null" }), // null for bulk messages
    
    // Message Content
    text: text("text").notNull(), // Text to convert to speech
    audioUrl: varchar("audio_url"), // S3 URL of generated audio (null until generated)
    duration: integer("duration"), // Audio duration in milliseconds
    
    // Generation Details
    status: voiceMessageStatusEnum("status").default("pending").notNull(),
    errorMessage: text("error_message"),
    model: varchar("model").default("eleven_multilingual_v2"), // ElevenLabs model used
    
    // Analytics
    listenCount: integer("listen_count").default(0),
    lastListenedAt: timestamp("last_listened_at"),
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_voice_messages_profile").on(table.voiceProfileId),
    index("idx_voice_messages_sender").on(table.senderId),
    index("idx_voice_messages_recipient").on(table.recipientId),
    index("idx_voice_messages_status").on(table.status),
  ]
);

// Voice message templates for quick generation
export const voiceMessageTemplates = pgTable(
  "voice_message_templates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(), // "Welcome Message", "Thank You", etc.
    text: text("text").notNull(), // Template text with {{variables}}
    category: varchar("category"), // "greeting", "thank_you", "promotion", etc.
    useCount: integer("use_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_voice_templates_user").on(table.userId),
  ]
);

// Relations
export const voiceProfilesRelations = relations(voiceProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [voiceProfiles.userId],
    references: [users.id],
  }),
  messages: many(voiceMessages),
}));

export const voiceMessagesRelations = relations(voiceMessages, ({ one }) => ({
  voiceProfile: one(voiceProfiles, {
    fields: [voiceMessages.voiceProfileId],
    references: [voiceProfiles.id],
  }),
  sender: one(users, {
    fields: [voiceMessages.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [voiceMessages.recipientId],
    references: [users.id],
  }),
}));

export const voiceMessageTemplatesRelations = relations(voiceMessageTemplates, ({ one }) => ({
  user: one(users, {
    fields: [voiceMessageTemplates.userId],
    references: [users.id],
  }),
}));

// Zod Schemas
export const insertVoiceProfileSchema = createInsertSchema(voiceProfiles).omit({
  id: true,
  voiceId: true,
  status: true,
  errorMessage: true,
  quality: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoiceMessageSchema = createInsertSchema(voiceMessages).omit({
  id: true,
  audioUrl: true,
  duration: true,
  status: true,
  errorMessage: true,
  listenCount: true,
  lastListenedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoiceMessageTemplateSchema = createInsertSchema(voiceMessageTemplates).omit({
  id: true,
  useCount: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type InsertVoiceProfile = z.infer<typeof insertVoiceProfileSchema>;
export type VoiceMessage = typeof voiceMessages.$inferSelect;
export type InsertVoiceMessage = z.infer<typeof insertVoiceMessageSchema>;
export type VoiceMessageTemplate = typeof voiceMessageTemplates.$inferSelect;
export type InsertVoiceMessageTemplate = z.infer<typeof insertVoiceMessageTemplateSchema>;

// ===== FAN-TO-CREATOR LOANS (PEER-TO-PEER MICROLENDING) =====

// Loan statuses
export const loanStatusEnum = pgEnum("loan_status", [
  "pending",      // Loan request created, awaiting approval
  "approved",     // Loan approved, awaiting disbursement
  "active",       // Loan disbursed, repayment in progress
  "completed",    // Loan fully repaid
  "defaulted",    // Loan defaulted (missed payments)
  "cancelled",    // Loan cancelled before disbursement
]);

// Repayment statuses
export const repaymentStatusEnum = pgEnum("repayment_status", [
  "pending",
  "paid",
  "overdue",
  "waived",
]);

// Fan-to-Creator Loans (P2P microlending)
export const fanCreatorLoans = pgTable(
  "fan_creator_loans",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    
    // Parties
    lenderId: varchar("lender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // Fan
    borrowerId: varchar("borrower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // Creator
    
    // Loan terms
    principalCents: bigint("principal_cents", { mode: "number" }).notNull(),
    interestRateBps: integer("interest_rate_bps").notNull(), // basis points (based on trust score)
    termDays: integer("term_days").notNull(), // loan duration
    totalDueCents: bigint("total_due_cents", { mode: "number" }).notNull(), // principal + interest
    
    // Status
    status: loanStatusEnum("status").default("pending").notNull(),
    
    // Payment schedule
    installmentCount: integer("installment_count").default(1), // number of payments
    installmentFrequency: varchar("installment_frequency").default("monthly"), // weekly, monthly, one-time
    
    // Collateral (optional)
    collateralType: varchar("collateral_type"), // content_revenue, future_earnings, token_pledge
    collateralValueCents: bigint("collateral_value_cents", { mode: "number" }),
    collateralMetadata: jsonb("collateral_metadata").default({}),
    
    // Risk assessment
    trustScore: integer("trust_score").default(0), // borrower's trust score at time of loan
    riskTier: varchar("risk_tier").default("standard"), // low, standard, high
    
    // Wallet references
    lenderWalletId: varchar("lender_wallet_id"),
    borrowerWalletId: varchar("borrower_wallet_id"),
    
    // Lifecycle dates
    requestedAt: timestamp("requested_at").defaultNow(),
    approvedAt: timestamp("approved_at"),
    approvedBy: varchar("approved_by"), // can be auto-approved or admin
    disbursedAt: timestamp("disbursed_at"),
    dueDate: timestamp("due_date"),
    completedAt: timestamp("completed_at"),
    defaultedAt: timestamp("defaulted_at"),
    
    // Repayment tracking
    amountPaidCents: bigint("amount_paid_cents", { mode: "number" }).default(0),
    amountOutstandingCents: bigint("amount_outstanding_cents", { mode: "number" }),
    lastPaymentAt: timestamp("last_payment_at"),
    
    // Notes and metadata
    purpose: text("purpose"), // why creator needs the loan
    notes: text("notes"),
    metadata: jsonb("metadata").default({}),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_fan_creator_loans_lender").on(table.lenderId),
    index("idx_fan_creator_loans_borrower").on(table.borrowerId),
    index("idx_fan_creator_loans_status").on(table.status),
    index("idx_fan_creator_loans_trust_score").on(table.trustScore),
    index("idx_fan_creator_loans_due_date").on(table.dueDate),
  ],
);

// Loan repayments (installments)
export const loanRepayments = pgTable(
  "loan_repayments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    loanId: varchar("loan_id")
      .notNull()
      .references(() => fanCreatorLoans.id, { onDelete: "cascade" }),
    
    // Repayment details
    installmentNumber: integer("installment_number").notNull(),
    amountDueCents: bigint("amount_due_cents", { mode: "number" }).notNull(),
    amountPaidCents: bigint("amount_paid_cents", { mode: "number" }).default(0),
    
    // Dates
    dueDate: timestamp("due_date").notNull(),
    paidAt: timestamp("paid_at"),
    
    // Status
    status: repaymentStatusEnum("status").default("pending").notNull(),
    
    // Late fees
    lateFeeAppliedCents: bigint("late_fee_applied_cents", { mode: "number" }).default(0),
    
    // Transaction reference
    transactionId: varchar("transaction_id"), // FanzLedger transaction ID
    
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_loan_repayments_loan").on(table.loanId),
    index("idx_loan_repayments_due_date").on(table.dueDate),
    index("idx_loan_repayments_status").on(table.status),
  ],
);

// Relations
export const fanCreatorLoansRelations = relations(fanCreatorLoans, ({ one, many }) => ({
  lender: one(users, {
    fields: [fanCreatorLoans.lenderId],
    references: [users.id],
  }),
  borrower: one(users, {
    fields: [fanCreatorLoans.borrowerId],
    references: [users.id],
  }),
  repayments: many(loanRepayments),
}));

export const loanRepaymentsRelations = relations(loanRepayments, ({ one }) => ({
  loan: one(fanCreatorLoans, {
    fields: [loanRepayments.loanId],
    references: [fanCreatorLoans.id],
  }),
}));

// Zod Schemas
export const insertFanCreatorLoanSchema = createInsertSchema(fanCreatorLoans).omit({
  id: true,
  status: true,
  approvedAt: true,
  approvedBy: true,
  disbursedAt: true,
  completedAt: true,
  defaultedAt: true,
  amountPaidCents: true,
  lastPaymentAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoanRepaymentSchema = createInsertSchema(loanRepayments).omit({
  id: true,
  amountPaidCents: true,
  paidAt: true,
  status: true,
  lateFeeAppliedCents: true,
  createdAt: true,
});

// Types
export type FanCreatorLoan = typeof fanCreatorLoans.$inferSelect;
export type InsertFanCreatorLoan = z.infer<typeof insertFanCreatorLoanSchema>;
export type LoanRepayment = typeof loanRepayments.$inferSelect;
export type InsertLoanRepayment = z.infer<typeof insertLoanRepaymentSchema>;

// ===== PWA EXTENSIONS =====
// Import PWA schemas
export * from "./pwaPatch";
