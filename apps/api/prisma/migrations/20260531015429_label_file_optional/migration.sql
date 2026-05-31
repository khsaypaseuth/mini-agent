-- DropForeignKey
ALTER TABLE "labels" DROP CONSTRAINT "labels_file_id_fkey";

-- AlterTable
ALTER TABLE "labels" ALTER COLUMN "file_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
