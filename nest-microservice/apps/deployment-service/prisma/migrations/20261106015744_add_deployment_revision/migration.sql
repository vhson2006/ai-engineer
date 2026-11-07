-- AlterTable
ALTER TABLE "deployments" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;

-- Not expressible in schema.prisma: revisions start at 1 and only grow.
ALTER TABLE "deployments" ADD CONSTRAINT "ck_deployments_revision" CHECK ("revision" >= 1);
