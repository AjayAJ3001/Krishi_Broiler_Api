--1. Farm Activities
CREATE TABLE "farm_activities" (
  "id" SERIAL PRIMARY KEY,
  "date" DATE,
  "in_time" TIME WITHOUT TIME ZONE,
  "out_time" TIME WITHOUT TIME ZONE,
  "running_km" NUMERIC(6, 2), 
  "total_farms" INTEGER,
  "plant_id" VARCHAR(100),
  "vehicle_number" VARCHAR(100),
  "start_km" NUMERIC(6, 2),
  "end_km" NUMERIC(6, 2),
  "farm_location" VARCHAR(100),
  "batch_no" VARCHAR(100),
  "age" VARCHAR(100),
  "housed" VARCHAR(100),
  "stock" INTEGER,
  "farms_maintenance" VARCHAR(100),
  "litter_quality" VARCHAR(100),
  "drinker_cleaning" VARCHAR(100),
  "body_weight" NUMERIC(4, 2), 
  "mortality" VARCHAR(100),
  "upload_mortality" TEXT,
  "reason" TEXT,
  "treatment" VARCHAR(100),
  "cum_mortality_count" INTEGER,
  "cum_mortality_percentage" NUMERIC(5, 2), 
  "bags_quantity" INTEGER,
  "feed_master" VARCHAR(100),
  "bags_stock" DECIMAL(10, 2),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--2. Shed Readiness
CREATE TABLE "shed_readiness" (
  "id" SERIAL PRIMARY KEY,
  "plant_id" VARCHAR(100),
  "date" DATE,
  "chick_house_capacity" INTEGER,
  "batch_no" VARCHAR(100),
  "previous_batch" VARCHAR(100),
  "farmer" VARCHAR(100),
  "chick_excess_housed" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--3. Issue Medicine / Vaccine
CREATE TABLE "issue_medicine" (
  "id" SERIAL PRIMARY KEY,
  "plant_id" VARCHAR(100),
  "farmer" VARCHAR(100),
  "batch_no" VARCHAR(100),
  "bird_stock" INTEGER, 
  "age" INTEGER,
  "material_id" VARCHAR(100),
  "transfer_quantity" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--4. Feed Transfer  
CREATE TABLE "feed_transfer" (
    "id" SERIAL PRIMARY KEY,
    "transfer_type" VARCHAR(200) , 
    "vehicle_no" VARCHAR(200),             
    "ift_charges" DECIMAL(8, 2), 
    "from_farmer" VARCHAR(200),
    "to_farmer" VARCHAR(200),
    "from_batch" VARCHAR(200),
    "to_batch" VARCHAR(200),
    "from_bird_stock" INTEGER,
    "to_bird_stock" INTEGER,
    "from_age" VARCHAR(200),
    "to_age" VARCHAR(200),
    "material_id" VARCHAR(200), 
    "transfer_quantity" NUMERIC(10, 2),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--5. Feed Return
CREATE TABLE "feed_return" (
  "id" SERIAL PRIMARY KEY,
  "date" DATE,
  "plant_id" VARCHAR(100),
  "batch_no" VARCHAR(100),
  "bird_stock" INTEGER,
  "farmer" VARCHAR(100),
  "material_id" VARCHAR(100),
  "transfer_quantity" NUMERIC(10, 2),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--6. Broiler supply
CREATE TABLE "broiler_supply" (
  "id" SERIAL PRIMARY KEY,
  "date" DATE,
  "customer_type" VARCHAR(100),
  "dc_no" INTEGER,
  "sales_type" VARCHAR(100),
  "vehicle_no" VARCHAR(100),
  "farmer" VARCHAR(100),
  "plant_id" VARCHAR(100),
  "line_no" INTEGER,
  "farm_shed_no" VARCHAR(100),
  "batch_no" INTEGER,
  "age" VARCHAR(100),
  "bird_stock" INTEGER,
  "excess" INTEGER,
  "shortage" INTEGER,
  "bird_quantity" INTEGER,
  "rate" NUMERIC(8, 2),
  "empty_weight" NUMERIC(8, 2), -- Increased precision for consistency
  "load_weight" NUMERIC(8, 2), -- Corrected to NUMERIC(8, 2)
  "weight" NUMERIC(8, 2),       -- Corrected to NUMERIC(8, 2)
  "amt_weight" NUMERIC(8, 2),
  "cross_value" NUMERIC(8, 2),
  "bill_value" NUMERIC(8, 2),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--7. Feed request
CREATE TABLE "feed_request" (
  "id" SERIAL PRIMARY KEY,
  "plant_id" VARCHAR(100),
  "farmer" VARCHAR(100),
  "fg1" NUMERIC(8, 2),
  "fg2" NUMERIC(8, 2),
  "fg3" NUMERIC(8, 2),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--8. Feed Approval
CREATE TABLE "feed_approval" (
  "id" SERIAL PRIMARY KEY,
  "plant_id" VARCHAR(100),
  "farmer" VARCHAR(100),
  "requested_date" DATE,
  "fg1" NUMERIC(8, 2),
  "fg2" NUMERIC(8, 2),
  "fg3" NUMERIC(8, 2),
  "suppling_plant" VARCHAR(100),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);