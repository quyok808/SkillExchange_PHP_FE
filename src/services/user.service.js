// src/services/user.service.js
import axios from "axios";
import authHeader from "./auth-header"; //Để gửi token

const API_URL = "http://localhost:5008/api/users/"; //Thay đổi URL này
const auth_Header = authHeader();

const updateUser = (formData) => {
  return axios.put(API_URL + "update-profile", formData, {
    headers: auth_Header
  });
};

const updateUserSkills = async (data) => {
  return axios.put(API_URL + "add-skill", data, {
    headers: auth_Header
  });
};

const searchUser = async (params) => {
  try {
    const response = await axios.get(API_URL + "search", {
      headers: auth_Header,
      params // Truyền params dưới dạng query string
    });

    // console.log(response.data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Đã xảy ra lỗi khi tìm kiếm" };
  }
};

const searchUserInNetwork = async (params) => {
  try {
    const response = await axios.get(API_URL + "search-user-in-network", {
      headers: auth_Header,
      params // Truyền params dưới dạng query string
    });

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Đã xảy ra lỗi khi tìm kiếm" };
  }
};

const getAvatarUser = async (userId) => {
  const response = await axios.get(API_URL + "profile/image/" + userId, {
    headers: auth_Header
  });
  return response.data;
};

const getUserIDs = async () => {
  const response = await axios.get(API_URL + "getUserID", {
    headers: auth_Header
  });
  return response.data;
};

const getName = async (userId) => {
  const response = await axios.get(API_URL + "name/" + userId, {
    headers: auth_Header
  });
  return response.data;
};

const userService = {
  updateUser,
  updateUserSkills,
  searchUser,
  getAvatarUser,
  getUserIDs,
  searchUserInNetwork,
  getName
};

export default userService;
