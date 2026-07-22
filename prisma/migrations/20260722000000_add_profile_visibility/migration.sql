-- Add visibility flag to profiles so admins can hide profiles from the public picker
ALTER TABLE "Profile" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;
