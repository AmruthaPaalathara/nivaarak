import axios from "axios";
const UserDocument = require("../models/application/userDocumentSchema");


exports.getUserDocumentsByUserId = async (userId) => {
  return UserDocument.find({userId});
};