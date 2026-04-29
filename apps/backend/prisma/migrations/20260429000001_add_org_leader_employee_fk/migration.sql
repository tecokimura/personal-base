-- AddForeignKey
-- OrganizationLeader.employeeId -> Employee.id
ALTER TABLE "OrganizationLeader" ADD CONSTRAINT "OrganizationLeader_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
