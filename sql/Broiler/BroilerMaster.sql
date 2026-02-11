-- 1) broiler_stock_location
CREATE TABLE "broiler_stock_location" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10) NOT NULL,
  "lifnr" VARCHAR(40) NOT NULL,
  "wName1" VARCHAR(200),
  "lName1" VARCHAR(300),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "lifnr")
);

-- 2) line_master
CREATE TABLE "line_master" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10),
  "zzline" VARCHAR(50) NOT NULL,
  "zzlineN" VARCHAR(200),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "zzline")
);

-- 3) shed_capacity_master
CREATE TABLE "shed_capacity_master" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zzfarmSt" VARCHAR(50) NOT NULL,
  "zperShed" NUMERIC(10,2),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zzfarmSt")
);

-- 4) hetchery_machine_master
CREATE TABLE "hetchery_machine_master" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zzbroMacN" VARCHAR(100) NOT NULL,
  "zzbroMac" VARCHAR(100),
  "zzcapacity" NUMERIC(10,2),
  "zsetQty" INTEGER,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zzbroMacN")
);

-- 5) rejection_reason_master
CREATE TABLE "rejection_reason_master" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "rsType" VARCHAR(20) NOT NULL,
  "rsCode" VARCHAR(20) NOT NULL,
  "rsTxt" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "rsType", "rsCode")
);

-- 6) broiler_mortality_reason
CREATE TABLE "broiler_mortality_reason" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "rsCode" VARCHAR(20) NOT NULL,
  "rsTxt" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "rsCode")
);

-- 7) standard_body_master
CREATE TABLE "standard_body_master" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zzAge" INTEGER NOT NULL,
  "zsfiKg" NUMERIC(10,2),
  "zstdBw" NUMERIC(10,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zzAge")
);

-- 8) mortality_incentive
CREATE TABLE "mortality_incentive" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zzfrmoFcr" NUMERIC(10,4) NOT NULL,
  "zztoFcr" NUMERIC(10,4) NOT NULL,
  "amount" NUMERIC(12,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zzfrmoFcr", "zztoFcr")
);

-- 9) mortality_deduction
CREATE TABLE "mortality_deduction" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zzfrmoFcr" NUMERIC(10,4) NOT NULL,
  "zztoFcr" NUMERIC(10,4) NOT NULL,
  "amount" NUMERIC(12,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zzfrmoFcr", "zztoFcr")
);

-- 10) medicine_deduction_maintain
CREATE TABLE "medicine_deduction_maintain" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "wrbtr" NUMERIC(12,4),
  "wrbtrP" NUMERIC(10,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "wrbtr", "wrbtrP")
);

-- 11) earned_rc_master
CREATE TABLE "earned_rc_master" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zerc" NUMERIC(10,4) NOT NULL,
  "znewGc" NUMERIC(10,4),
  "zsel" VARCHAR(100),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zerc")
);

-- 12) vehicle_type_cost
CREATE TABLE "vehicle_type_cost" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zvehStyp" VARCHAR(20) NOT NULL,
  "traCost" NUMERIC(12,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zvehStyp")
);

-- 13) fcr_grade_master
CREATE TABLE "fcr_grade_master" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zgrade" VARCHAR(50) NOT NULL,
  "zerc" NUMERIC(10,4),
  "zerc1" NUMERIC(10,4),
  "zsel" VARCHAR(100),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zgrade")
);

-- 14) earned_rc_master1
CREATE TABLE "earned_rc_master1" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zerc" NUMERIC(10,4) NOT NULL,
  "znewGc" NUMERIC(10,4),
  "zsel" VARCHAR(100),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zerc")
);

-- 15) broiler_sales_emp_default
CREATE TABLE "broiler_sales_emp_default" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10) NOT NULL,
  "zzdispBy" VARCHAR(100) NOT NULL,
  "zzorderBy" VARCHAR(100),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "zzdispBy", "zzorderBy")
);

-- 16) broiler_sales_rate
CREATE TABLE "broiler_sales_rate" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10),
  "allPer" VARCHAR(50) NOT NULL,
  "rate" NUMERIC(12,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "allPer")
);

-- 17) egg_code_list
CREATE TABLE "egg_code_list" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "matnr" VARCHAR(80) NOT NULL,
  "maktx" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "matnr")
);

-- 18) fcr_grade_master1
CREATE TABLE "fcr_grade_master1" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "zerc" NUMERIC(10,4) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "zerc")
);

-- 20) broiler_shed_incentive_details
CREATE TABLE "broiler_shed_incentive_details" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10) NOT NULL,
  "begda" DATE,
  "endda" DATE,
  "shedInc" NUMERIC(12,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "begda", "endda")
);

-- 21) mortality_incentive_plant
CREATE TABLE "mortality_incentive_plant" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10) NOT NULL,
  "zzfrmoFcr" NUMERIC(10,4) NOT NULL,
  "zztoFcr" NUMERIC(10,4) NOT NULL,
  "amount" NUMERIC(12,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "zzfrmoFcr", "zztoFcr")
);

-- 22) mortality_deduction_plant
CREATE TABLE "mortality_deduction_plant" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10) NOT NULL,
  "zzfrmoFcr" NUMERIC(10,4) NOT NULL,
  "zztoFcr" NUMERIC(10,4) NOT NULL,
  "amount" NUMERIC(12,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "zzfrmoFcr", "zztoFcr")
);

-- 23) mortality_deduction_maintain_plant
CREATE TABLE "mortality_deduction_maintain_plant" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10) NOT NULL,
  "wrbtr" NUMERIC(12,4),
  "wrbtrP" NUMERIC(10,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "wrbtr", "wrbtrP")
);

-- 24) earned_rc_master2
CREATE TABLE "earned_rc_master2" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10),
  "zerc" NUMERIC(10,4) NOT NULL,
  "znewGc" NUMERIC(10,4),
  "zsel" VARCHAR(100),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "zerc")
);

-- 25) earned_rc_master3
CREATE TABLE "earned_rc_master3" (
  "id" SERIAL PRIMARY KEY,
  "mandt" VARCHAR(10) NOT NULL,
  "werks" VARCHAR(10),
  "zerc" NUMERIC(10,4) NOT NULL,
  "znewGc" NUMERIC(10,4),
  "zsel" VARCHAR(100),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mandt", "werks", "zerc")
);
