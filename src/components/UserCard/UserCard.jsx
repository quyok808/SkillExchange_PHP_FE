/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";
import styles from "./UserCard.module.css";
import userService from "../../services/user.service";
import CreateAppointmentForm from "../CreateAppointmentForm/CreateAppointmentForm"; // Import component
import appointmentService from "../../services/appointment.service";
import Toast from "./../../utils/Toast";
import { useNavigate } from "react-router-dom";
import connectionService from "../../services/connection.service";
import socket from "../../configs/socket/socket";

function UserCard({ avatar, name, address, skills, userid }) {
  const navigate = useNavigate();
  const [state, setState] = useState({
    chatRoomId: null,
    connectionStatus: null,
    connectionId: null,
    isReceivedRequest: false,
    userIds: [],
    isModalOpen: false,
    isLoading: false
  });

  // Hàm helper để fetch với error handling
  const fetchWithErrorHandling = async (fetchFn, errorMessage, signal) => {
    try {
      const response = await fetchFn({ signal });
      return response.data;
    } catch (error) {
      if (!signal.aborted) console.error(errorMessage, error);
      throw error;
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchAllData = async () => {
      if (!userid) return;

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const [connectionData, userIdsData] = await Promise.all([
          fetchWithErrorHandling(
            () => connectionService.checkConnectionStatus(userid),
            "Error checking connection status:",
            signal
          ),
          fetchWithErrorHandling(
            () => userService.getUserIDs(),
            "Error fetching user IDs:",
            signal
          )
        ]);

        setState((prev) => ({
          ...prev,
          connectionStatus: connectionData?.status || null,
          connectionId: connectionData?.connectionId || null,
          isReceivedRequest: connectionData?.received || false,
          chatRoomId: connectionData?.chatRoomId || null,
          userIds: userIdsData?.userIds || [],
          isLoading: false
        }));
      } catch (error) {
        if (!signal.aborted) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    };

    fetchAllData();

    return () => controller.abort();
  }, [userid]);

  // Các handler giữ nguyên, chỉ cập nhật state mới
  const handleConnect = async () => {
    try {
      await connectionService.sendRequest(userid);
      setState((prev) => ({
        ...prev,
        connectionStatus: "pending_sent",
        isReceivedRequest: false
      }));
    } catch (error) {
      console.error("Error sending request:", error);
    }
  };

  const handleCancelRequest = async () => {
    try {
      await connectionService.cancelRequest(userid);
      setState((prev) => ({ ...prev, connectionStatus: "none" }));
    } catch (error) {
      console.error("Error canceling request:", error);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      await connectionService.acceptRequest(state.connectionId);
      setState((prev) => ({
        ...prev,
        connectionStatus: "connected",
        isReceivedRequest: false
      }));
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleRejectRequest = async () => {
    try {
      await connectionService.rejectRequest(state.connectionId);
      setState((prev) => ({
        ...prev,
        connectionStatus: "none",
        isReceivedRequest: false,
        connectionId: null
      }));
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  const handleChat = () => {
    if (state.chatRoomId) {
      navigate(`/chat/${state.chatRoomId}/${userid}/${name}`);
    } else {
      console.error("Không tìm thấy chatRoomId!");
    }
  };

  const handleOpenModal = () =>
    setState((prev) => ({ ...prev, isModalOpen: true }));
  const handleCloseModal = () =>
    setState((prev) => ({ ...prev, isModalOpen: false }));

  const handleAppointmentSubmit = async (appointmentData) => {
    try {
      const requestData = {
        receiverId: userid,
        startTime: new Date(appointmentData.startTime).toISOString(),
        endTime: new Date(appointmentData.endTime).toISOString(),
        description: appointmentData.description
      };
      const response = await appointmentService.createAppointment(requestData);

      if (response) {
        socket.emit("send-notify-book-appointment", requestData.receiverId);
        Toast.fire({ icon: "success", title: response.message });
      } else {
        Toast.fire({ icon: "error", title: response.message });
      }
    } catch (error) {
      console.error("Lỗi khi tạo lịch hẹn:", error);
    } finally {
      setState((prev) => ({ ...prev, isModalOpen: false }));
    }
  };

  const isConnected = state.userIds.includes(userid);
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <img src={avatar} alt={name} className={styles.cardAvatar} />
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.cardName}>{name}</h3>
        <p className={styles.cardMajor}>
          Kỹ năng: <span>{skills}</span>
        </p>
        <p className={styles.cardLearn}>
          Địa chỉ: <span>{address}</span>
        </p>

        {state.connectionStatus === "connected" ? (
          <div className={styles.chat}>
            <button className={styles.connectButton} onClick={handleOpenModal}>
              Đặt lịch
            </button>
            <button className={styles.connectButton} onClick={handleChat}>
              Nhắn tin
            </button>
          </div>
        ) : state.connectionStatus === "pending_sent" ? (
          <button
            className={styles.connectButton}
            onClick={handleCancelRequest}
          >
            Hủy yêu cầu
          </button>
        ) : state.connectionStatus === "pending_received" ? (
          <div className={styles.chat}>
            <button
              className={styles.connectButton}
              onClick={handleAcceptRequest}
            >
              Chấp nhận
            </button>
            <button
              className={styles.connectButton}
              onClick={handleRejectRequest}
            >
              Từ chối
            </button>
          </div>
        ) : (
          <button className={styles.connectButton} onClick={handleConnect}>
            Kết nối
          </button>
        )}
      </div>

      {/* Hiển thị modal nếu isModalOpen là true */}
      <CreateAppointmentForm
        isOpen={state.isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAppointmentSubmit}
      />
    </div>
  );
}

export default UserCard;
