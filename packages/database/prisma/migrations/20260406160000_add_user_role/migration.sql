DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'UserRole'
  ) THEN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE "user"
    ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'role'
      AND udt_name <> 'UserRole'
  ) THEN
    ALTER TABLE "user"
    ALTER COLUMN "role" DROP DEFAULT;

    ALTER TABLE "user"
    ALTER COLUMN "role" TYPE "UserRole"
    USING "role"::text::"UserRole";

    ALTER TABLE "user"
    ALTER COLUMN "role" SET DEFAULT 'USER';
  END IF;
END $$;

UPDATE "user"
SET "role" = 'ADMIN'
WHERE "username" = 'admin';
