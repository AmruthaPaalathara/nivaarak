// models/DepartmentMapping.js
const mongoose = require('mongoose');

const departmentMappingSchema = new mongoose.Schema({
    documentType: { type: String, required: true },
    department: { type: String, required: true },
});

const DepartmentMapping =
    mongoose.models.DepartmentMapping ||
    mongoose.model('DepartmentMapping', departmentMappingSchema);

module.exports = DepartmentMapping;
