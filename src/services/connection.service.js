import axios from "axios";
import authHeader from "./auth-header";

const API_URL = "http://localhost:5008/api/connections/";

const connectionService = {
  sendRequest: async (receiverId) => {
    try {
      const response = await axios.post(
        `${API_URL}request`,
        { receiverId },
        { headers: authHeader() }
      );
      return {
        status: "success",
        message: response.data.message
      };
    } catch (error) {
      console.error("Error sending request:", error);
      return { status: "error", message: error.response.data.message };
    }
  },

  acceptRequest: async (connectionId) => {
    try {
      const response = await axios.put(
        `${API_URL}${connectionId}/accept`,
        {},
        {
          headers: authHeader()
        }
      );
      return { status: "success", message: response.data.message };
    } catch (error) {
      return { status: "error", message: error.response.data.message };
    }
  },

  rejectRequest: async (connectionId) => {
    try {
      const response = await axios.put(
        `${API_URL}${connectionId}/reject`,
        {},
        {
          headers: authHeader()
        }
      );
      return { status: "success", message: response.data.message };
    } catch (error) {
      return { status: "error", message: error.response.data.message };
    }
  },

  cancelRequest: async (receiverId) => {
    try {
      const response = await axios.delete(`${API_URL}cancel/${receiverId}`, {
        headers: authHeader()
      });
      return { status: "success", message: response.data.message };
    } catch (error) {
      console.error("Error canceling request:", error);
      return { status: "error", message: error.response.data.message };
    }
  },

  checkConnectionStatus: async (userId) => {
    return await axios.get(`${API_URL}status/${userId}`, {
      headers: authHeader()
    });
  }
};

export default connectionService;
