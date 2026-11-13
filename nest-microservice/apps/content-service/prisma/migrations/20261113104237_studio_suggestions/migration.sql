-- AlterTable
ALTER TABLE "studio_brand_kits" ADD COLUMN     "address" VARCHAR(200),
ADD COLUMN     "hours" VARCHAR(300),
ADD COLUMN     "prices" VARCHAR(400),
ADD COLUMN     "website" VARCHAR(80);

-- AlterTable
ALTER TABLE "studio_projects" ADD COLUMN     "suggest_job_id" UUID;
