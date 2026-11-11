-- No optimistic concurrency any more (ADR 0029, supersedes 0005): the revision columns go.
-- AlterTable
ALTER TABLE "sites" DROP COLUMN "revision";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "revision";

-- AlterTable
ALTER TABLE "articles" DROP COLUMN "revision";
