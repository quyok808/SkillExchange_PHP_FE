import React, { useState, useEffect } from "react";
import styles from "./UserCard.module.css";
import userService from "../../services/user.service";
import CreateAppointmentForm from "../CreateAppointmentForm/CreateAppointmentForm";
import appointmentService from "../../services/appointment.service";
import Toast from "./../../utils/Toast";
import { useNavigate } from "react-router-dom";
import connectionService from "../../services/connection.service";
import socket from "../../configs/socket/socket";
import {
  sendConnection,
  cleanupSocket,
  sendCancelRequest,
  sendRejectRequest,
  sendAcceptRequest
} from "./../../configs/socket/socket";

function UserCard({ avatar, name, address, skills, userid, openCard }) {
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

  // Hàm fetch connection status
  const fetchConnectionStatus = async (signal) => {
    if (!userid) return;
    try {
      const connectionData = await fetchWithErrorHandling(
        () => connectionService.checkConnectionStatus(userid),
        "Error checking connection status:",
        signal
      );
      setState((prev) => ({
        ...prev,
        connectionStatus: connectionData?.status || null,
        connectionId: connectionData?.connectionId || null,
        isReceivedRequest: connectionData?.received || false,
        chatRoomId: connectionData?.chatRoomId || null
      }));
    } catch (error) {
      if (!signal.aborted) {
        console.error("UserCard - Error fetching connection status:", error);
      }
    }
  };

  // Fetch dữ liệu ban đầu
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

  // Socket listener để cập nhật connection status
  useEffect(() => {
    const handleNotify = () => {
      const controller = new AbortController();
      fetchConnectionStatus(controller.signal);
      return () => controller.abort();
    };

    socket.on("receive-notify-request-connection", handleNotify);
    socket.on("receive-cancel-notify-request-connection", handleNotify);
    socket.on("receive-reject-notify-request-connection", handleNotify);
    socket.on("receive-accept-notify-request-connection", handleNotify);

    return () => {
      socket.off("receive-notify-request-connection", handleNotify);
      socket.off("receive-cancel-notify-request-connection", handleNotify);
      socket.off("receive-reject-notify-request-connection", handleNotify);
      socket.off("receive-accept-notify-request-connection", handleNotify);
    };
  }, [userid]);

  const handleConnect = async () => {
    try {
      const response = await connectionService.sendRequest(userid);
      setState((prev) => ({
        ...prev,
        connectionStatus: "pending_sent",
        isReceivedRequest: false
      }));

      if (response.status === "success") {
        sendConnection(userid);

        Toast.fire({
          icon: "success",
          title: `Gửi lời mời kết nối thành công!`
        });
      } else {
        Toast.fire({ icon: "error", title: response.message });
      }
    } catch (error) {
      console.error("Error sending request:", error);
    }
  };

  const handleCancelRequest = async () => {
    try {
      const response = await connectionService.cancelRequest(userid);
      setState((prev) => ({ ...prev, connectionStatus: "none" }));

      if (response.status === "success") {
        Toast.fire({ icon: "success", title: "Huỷ lời mời thành công" });
        try {
          sendCancelRequest(userid);
          await fetchConnectionStatus();
        } catch (error) {
          cleanupSocket();
        }
      } else {
        Toast.fire({ icon: "error", title: response.message });
      }
    } catch (error) {
      console.error("Error canceling request:", error);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      const response = await connectionService.acceptRequest(
        state.connectionId
      );
      if (response.status === "success") {
        Toast.fire({
          icon: "success",
          title: "Kết nối thành công, chúc bạn học thêm được kỹ năng mới!"
        });
        try {
          sendAcceptRequest(userid);
          await fetchConnectionStatus();
          setState((prev) => ({
            ...prev,
            connectionStatus: "connected",
            isReceivedRequest: false
          }));
        } catch (error) {
          cleanupSocket();
        }
      }
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleRejectRequest = async () => {
    try {
      const response = await connectionService.rejectRequest(
        state.connectionId
      );
      if (response.status === "success") {
        Toast.fire({ icon: "success", title: response.message });
        setState((prev) => ({
          ...prev,
          connectionStatus: "none",
          isReceivedRequest: false,
          connectionId: null
        }));

        try {
          sendRejectRequest(userid);
          await fetchConnectionStatus();
        } catch (error) {
          cleanupSocket();
        }
      }
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
      if (response?.status) {
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
  const handleInfoClick = () => {
    openCard(
      userid,
      handleChat,
      state.connectionStatus,
      handleAcceptRequest,
      handleCancelRequest,
      handleRejectRequest,
      handleOpenModal,
      handleConnect
    );
  };

  const handleButtonClick = (e, action) => {
    e.stopPropagation();
    action();
  };
  return (
    <div className={styles.card} onClick={handleInfoClick}>
      <div className={styles.cardTop}>
        <img
          src={avatar.replace(
            `${import.meta.env.VITE_API_URL}/storage`,
            "/storage"
          )}
          alt={name}
          className={styles.cardAvatar}
        />
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
            <button
              className={styles.connectButton}
              onClick={(e) => handleButtonClick(e, handleOpenModal)}
            >
              Đặt lịch
            </button>
            <button
              className={styles.connectButton}
              onClick={(e) => handleButtonClick(e, handleChat)}
            >
              Nhắn tin
            </button>
          </div>
        ) : state.connectionStatus === "pending_sent" ? (
          <button
            className={styles.connectButton}
            onClick={(e) => handleButtonClick(e, handleCancelRequest)}
          >
            Hủy yêu cầu
          </button>
        ) : state.connectionStatus === "pending_received" ? (
          <div className={styles.chat}>
            <button
              className={styles.connectButton}
              onClick={(e) => handleButtonClick(e, handleAcceptRequest)}
            >
              Chấp nhận
            </button>
            <button
              className={styles.connectButton}
              onClick={(e) => handleButtonClick(e, handleRejectRequest)}
            >
              Từ chối
            </button>
          </div>
        ) : (
          <button
            className={styles.connectButton}
            onClick={(e) => handleButtonClick(e, handleConnect)}
          >
            Kết nối
          </button>
        )}
      </div>

      <CreateAppointmentForm
        isOpen={state.isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAppointmentSubmit}
      />
    </div>
  );
}

export default UserCard;
