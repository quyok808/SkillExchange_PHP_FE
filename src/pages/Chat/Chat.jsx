/* eslint-disable react/no-unknown-property */
// export default ChatRoom;
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from "react";
import Modal from "react-modal";
import { useParams } from "react-router-dom";
import userService from "../../services/user.service";
import chatService from "../../services/chat.service";
import authService from "../../services/auth.service";
import iconcamera from "../../assets/ic_camera.svg";
import iconImage from "../../assets/ic_image.svg";
import iconAttach from "../../assets/ic_attach.svg";
import { IoLogoWechat } from "react-icons/io5";
import { FaPhone } from "react-icons/fa";
import { LuScreenShare } from "react-icons/lu";
import iconSend from "../../assets/ic_send.svg";
import { FiCamera } from "react-icons/fi";
import { IoCloseCircle } from "react-icons/io5";
import { FaFilePdf, FaFileWord } from "react-icons/fa";
import { LuMic } from "react-icons/lu";
import { LuMicOff } from "react-icons/lu";
import { FiCameraOff } from "react-icons/fi";
import "./Chat.css";
import socket, {
  joinChatRoom,
  setUserOnline,
  checkUserStatus,
  cleanupSocket
} from "../../configs/socket/socket";
import Loading from "../../components/Loading";
import { MdOutlineReport } from "react-icons/md";
import reportService from "../../services/report.service";
import Toast from "../../utils/Toast";

const getFileIconAndType = (fileName) => {
  const extension = fileName.split(".").pop().toLowerCase();
  switch (extension) {
    case "pdf":
      return { icon: <FaFilePdf size={24} color="#FF5733" />, type: "Tệp PDF" };
    case "doc":
    case "docx":
      return {
        icon: <FaFileWord size={24} color="#2B579A" />,
        type: "Tệp Word"
      };
    default:
      return {
        icon: <FaFilePdf size={24} color="#FF5733" />,
        type: "Tệp không xác định"
      }; // Mặc định
  }
};

const ChatRoom = () => {
  const { chatRoomId, userid, name } = useParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState("offline");
  const [photos, setPhotos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const chatBoxRef = useRef(null);
  const observerRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState("");
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportStatus, setReportStatus] = useState("");

  const [showChat, setShowChat] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const miniChatBodyRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  };

  // Tải 50 tin nhắn cuối khi khởi tạo
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        const userData = currentUser?.data?.user;

        if (isMounted) {
          setUser(userData);
          setUserOnline(userData.id || userData._id);
          joinChatRoom(chatRoomId);
          checkUserStatus(userid);

          socket.on("userStatusResponse", ({ userId, status }) => {
            if (userId === userid) setOnlineStatus(status);
          });
          socket.on("onlineStatusUpdate", ({ userId, status }) => {
            if (userId === userid) setOnlineStatus(status);
          });

          // Lấy 50 tin nhắn cuối
          const result = await chatService.getMessages(chatRoomId, 1, 50);
          setMessages(result.data.reverse()); // Đảo ngược để hiển thị cũ -> mới
          setHasMore(
            result.pagination.currentPage < result.pagination.totalPages
          );

          socket.on("newMessage", (newMessage) => {
            setMessages((prevMessages) => {
              const exists = prevMessages.some(
                (msg) => msg.id === newMessage.id
              );
              if (!exists && newMessage.chatRoomId === chatRoomId) {
                return [...prevMessages, newMessage];
              }
              return prevMessages;
            });
          });

          setLoading(false);
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu ban đầu:", error);
        setErrorMessage("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
      cleanupSocket();
    };
  }, [chatRoomId, userid]);

  // Tải thêm tin nhắn khi scroll lên trên
  useEffect(() => {
    if (!chatBoxRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreMessages();
        }
      },
      { threshold: 0.1 }
    );

    const firstMessage = chatBoxRef.current.querySelector(
      ".message:first-child"
    );
    if (firstMessage) observer.observe(firstMessage);

    observerRef.current = observer;

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [messages, hasMore, loading]);

  const loadMoreMessages = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const result = await chatService.getMessages(chatRoomId, nextPage, 50);
      const newMessages = result.data.reverse(); // Đảo ngược để thêm vào đầu
      setMessages((prev) => [...newMessages, ...prev]);
      setPage(nextPage);
      setHasMore(result.pagination.currentPage < result.pagination.totalPages);
    } catch (error) {
      console.error("Lỗi khi tải thêm tin nhắn:", error);
      setErrorMessage("Không thể tải thêm tin nhắn.");
    } finally {
      setLoading(false);
    }
  };

  // Cuộn xuống dưới khi có tin nhắn mới
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() && !selectedImage && !selectedFile) return;

    try {
      const formData = new FormData();
      formData.append("chatRoomId", chatRoomId);
      if (message.trim()) formData.append("content", message);
      if (selectedImage) {
        console.log("Gửi hình ảnh:", selectedImage);
        formData.append("image", selectedImage);
      }
      if (selectedFile) formData.append("file", selectedFile);

      await chatService.sendMessage(formData);
      setMessage("");
      setSelectedImage(null);
      setSelectedFile(null);
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      setErrorMessage("Không thể gửi tin nhắn. Vui lòng thử lại sau.");
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const avatar = await userService.getAvatarUser(userid);
        setPhotos(avatar.data?.image);
      } catch (error) {
        console.log(error);
      }
    };
    fetchPhotos();
  }, [userid]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    setSelectedImage(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const triggerImageUpload = () => {
    imageInputRef.current.click();
  };

  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  const openReportModal = () => {
    setIsModalOpen(true);
    setReportReason("");
    setReportStatus("");
  };

  const closeReportModal = () => {
    setIsModalOpen(false);
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) {
      setReportStatus("Vui lòng chọn lý do báo cáo.");
      return;
    }

    try {
      const reportData = { userId: userid, reason: reportReason };
      await reportService.createReport(reportData);
      Toast.fire({ icon: "success", title: "Báo cáo đã được gửi thành công!" });
      setTimeout(() => {
        setIsModalOpen(false);
        setReportStatus("");
      }, 1000);
    } catch (error) {
      Toast.fire({
        icon: "error",
        title: "Không thể gửi báo cáo. Vui lòng thử lại sau."
      });
    }
  };

  const handleVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localVideoRef.current.srcObject = stream;

      peerConnectionRef.current = new RTCPeerConnection(servers);
      stream.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      peerConnectionRef.current.ontrack = (event) => {
        const remoteStream = event.streams[0];
        console.log(
          "Received stream:",
          remoteStream.id,
          remoteStream.getTracks()
        );

        // Phân biệt camera và màn hình dựa trên số lượng track và loại track
        const audioTracks = remoteStream.getAudioTracks();
        const videoTracks = remoteStream.getVideoTracks();

        if (
          audioTracks.length > 0 &&
          videoTracks.length > 0 &&
          remoteVideoRef.current
        ) {
          // Luồng camera (có cả audio và video)
          remoteVideoRef.current.srcObject = remoteStream;
        } else if (
          videoTracks.length > 0 &&
          audioTracks.length === 0 &&
          screenVideoRef.current
        ) {
          // Luồng màn hình (chỉ có video)
          screenVideoRef.current.srcObject = remoteStream;
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", {
            to: userid,
            candidate: event.candidate
          });
        }
      };

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socket.emit("callUser", { to: userid, offer });

      setInCall(true);
      setShowChat(false);
    } catch (error) {
      console.error("Error starting video call:", error);
      socket.off("callUser");
    }
  };

  const acceptCall = async () => {
    const { from, offer } = incomingCall;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    localVideoRef.current.srcObject = stream;

    peerConnectionRef.current = new RTCPeerConnection(servers);
    stream.getTracks().forEach((track) => {
      peerConnectionRef.current.addTrack(track, stream);
    });

    peerConnectionRef.current.ontrack = (event) => {
      const remoteStream = event.streams[0];
      console.log(
        "Received stream:",
        remoteStream.id,
        remoteStream.getTracks()
      );

      // Phân biệt camera và màn hình dựa trên số lượng track và loại track
      const audioTracks = remoteStream.getAudioTracks();
      const videoTracks = remoteStream.getVideoTracks();

      if (
        audioTracks.length > 0 &&
        videoTracks.length > 0 &&
        remoteVideoRef.current
      ) {
        // Luồng camera (có cả audio và video)
        remoteVideoRef.current.srcObject = remoteStream;
      } else if (
        videoTracks.length > 0 &&
        audioTracks.length === 0 &&
        screenVideoRef.current
      ) {
        // Luồng màn hình (chỉ có video)
        screenVideoRef.current.srcObject = remoteStream;
      }
    };

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", { to: from, candidate: event.candidate });
      }
    };

    await peerConnectionRef.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);
    socket.emit("answerCall", { to: from, answer });

    setInCall(true);
    setIncomingCall(null);
  };

  const declineCall = () => {
    socket.emit("endCall", { to: incomingCall.from });
    setIncomingCall(null);
  };

  const toggleMic = () => {
    const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        peerConnectionRef.current.addTrack(screenTrack, screenStream);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screenStream;
        }

        if (peerConnectionRef.current.signalingState === "stable") {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          socket.emit("updateOffer", { to: userid, offer });
        }

        screenTrack.onended = () => stopScreenSharing();
        setIsScreenSharing(true);
      } else {
        stopScreenSharing();
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
    }
  };

  const stopScreenSharing = async () => {
    if (!peerConnectionRef.current) return;

    const senders = peerConnectionRef.current.getSenders();
    const screenSender = senders.find(
      (s) =>
        s.track &&
        s.track.kind === "video" &&
        s.track.label.toLowerCase().includes("screen")
    );
    if (screenSender) {
      peerConnectionRef.current.removeTrack(screenSender);
    }

    if (screenVideoRef.current && screenVideoRef.current.srcObject) {
      screenVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
      screenVideoRef.current.srcObject = null;
    }

    // Gửi thông báo dừng chia sẻ màn hình
    socket.emit("screenShareEnded", { to: userid });

    if (peerConnectionRef.current.signalingState === "stable") {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socket.emit("updateOffer", { to: userid, offer });
    }

    setIsScreenSharing(false);
  };

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    localVideoRef.current.srcObject
      ?.getTracks()
      .forEach((track) => track.stop());
    remoteVideoRef.current.srcObject = null;
    screenVideoRef.current.srcObject = null;
    setInCall(false);
    setShowChat(false);
    setIsScreenSharing(false);
    socket.emit("endCall", { to: userid });
  };

  useEffect(() => {
    socket.on("incomingCall", ({ from, offer }) => {
      setIncomingCall({ from, offer });
    });

    socket.on("callAnswered", async ({ answer }) => {
      if (
        peerConnectionRef.current &&
        peerConnectionRef.current.signalingState === "have-local-offer"
      ) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        } catch (error) {
          console.error("Error setting remote answer:", error);
        }
      }
    });

    socket.on("iceCandidate", async ({ candidate }) => {
      if (
        candidate &&
        peerConnectionRef.current &&
        peerConnectionRef.current.signalingState !== "closed"
      ) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    });

    socket.on("updateOffer", async ({ from, offer }) => {
      if (
        peerConnectionRef.current &&
        peerConnectionRef.current.signalingState === "stable"
      ) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(offer)
          );
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          socket.emit("updateAnswer", { to: from, answer });
        } catch (error) {
          console.error("Error handling updateOffer:", error);
        }
      }
    });

    socket.on("updateAnswer", async ({ answer }) => {
      if (
        peerConnectionRef.current &&
        peerConnectionRef.current.signalingState === "have-local-offer"
      ) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        } catch (error) {
          console.error("Error handling updateAnswer:", error);
        }
      }
    });

    socket.on("screenShareEnded", () => {
      // Xóa luồng màn hình ở phía người nhận
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      setIsScreenSharing(false);
    });

    socket.on("callEnded", () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      localVideoRef.current.srcObject
        ?.getTracks()
        .forEach((track) => track.stop());
      remoteVideoRef.current.srcObject = null;
      screenVideoRef.current.srcObject = null;
      setInCall(false);
      setIsScreenSharing(false);
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callAnswered");
      socket.off("iceCandidate");
      socket.off("updateOffer");
      socket.off("updateAnswer");
      socket.off("screenShareEnded");
      socket.off("callEnded");
    };
  }, []);

  const CallNotification = () => {
    if (!incomingCall) return null;

    return (
      <div className="call-notification">
        <div className="call-notification-content">
          <img
            className="caller-avatar"
            src={photos || "default"}
            alt="Caller Avatar"
          />
          <p>{`${name || "User"} đang gọi bạn...`}</p>
          <div className="call-buttons">
            <button className="accept-button" onClick={acceptCall}>
              Chấp nhận
            </button>
            <button className="decline-button" onClick={declineCall}>
              Từ chối
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (miniChatBodyRef.current) {
      miniChatBodyRef.current.scrollTop = miniChatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  if (!user)
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1
        }}
      >
        <Loading />
      </div>
    );

  return (
    <div className="body-container">
      <div
        className={`video-call-container ${inCall ? "visible" : "hidden"} ${
          showChat ? "with-chat" : ""
        } `}
      >
        <video ref={localVideoRef} autoPlay muted className="local-video" />
        <video ref={remoteVideoRef} autoPlay className="remotes-video" />
        <video ref={screenVideoRef} autoPlay className="screen-video" />
        {inCall && (
          <>
            <div className="button-screen">
              <button onClick={toggleCamera} className="button-share">
                {isCameraOn ? (
                  <FiCamera size={30} color="white" />
                ) : (
                  <FiCameraOff size={30} color="white" />
                )}
              </button>
              <button onClick={toggleMic} className="button-share">
                {isMicOn ? (
                  <LuMic size={30} color="white" />
                ) : (
                  <LuMicOff size={30} color="white" />
                )}
              </button>
              <button onClick={toggleScreenShare} className="button-share">
                <LuScreenShare
                  size={30}
                  color={isScreenSharing ? "green" : "white"}
                />
              </button>
              <button onClick={endCall} className="button-end">
                <FaPhone size={30} color="white" />
              </button>
              <button
                className={`chat-bubble-button ${
                  showChat ? "bg-blue-600" : "bg-gray-500"
                }`}
                onClick={() => setShowChat(!showChat)}
              >
                <IoLogoWechat className="chat-icon" />
              </button>
            </div>
            {showChat && (
              <div className="mini-chat-container">
                <div className="mini-chat-header">
                  <span>Chat</span>
                  <button
                    className="close-chat-button"
                    onClick={() => setShowChat(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="mini-chat-body" ref={miniChatBodyRef}>
                  {Array.isArray(messages) && messages.length > 0 ? (
                    messages
                      .filter((message) => message && message.id) // Lọc tin nhắn hợp lệ
                      .map((message) => (
                        <div
                          key={message.id}
                          className={`mini-message ${
                            message.senderId === (user?.id || user?._id)
                              ? "message-right"
                              : "message-left"
                          }`}
                        >
                          {message.senderId !== (user?.id || user?._id) && (
                            <img
                              className="avatar"
                              src={photos || "default"}
                              alt="Receiver Avatar"
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                marginRight: "8px"
                              }}
                            />
                          )}
                          <div className="message-content">
                            {(message.content || message.message) && (
                              <div className="message-text">
                                {message.content || message.message}
                              </div>
                            )}
                            {message.image && (
                              <div className="message-image">
                                <img
                                  src={message.image.url || message.image}
                                  alt="Hình ảnh"
                                  style={{
                                    maxWidth: "150px",
                                    borderRadius: "8px"
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display =
                                      "block";
                                  }}
                                />
                                <span style={{ display: "none", color: "red" }}>
                                  Không thể tải hình ảnh
                                </span>
                              </div>
                            )}
                            {message.file && (
                              <a
                                href={message.file.url || message.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="message-file-container"
                                download={
                                  message.file.name ||
                                  message.file.url.split("/").pop()
                                }
                              >
                                <div className="file-preview">
                                  {
                                    getFileIconAndType(
                                      message.file.name || message.file.url
                                    ).icon
                                  }
                                  <div className="file-info">
                                    <span className="file-name">
                                      {message.file.name ||
                                        message.file.url.split("/").pop() ||
                                        "Tệp không tên"}
                                    </span>
                                    <span className="file-size">
                                      {
                                        getFileIconAndType(
                                          message.file.name || message.file.url
                                        ).type
                                      }
                                    </span>
                                  </div>
                                </div>
                              </a>
                            )}
                            <small
                              style={{ fontSize: "12px", color: "#5f6368" }}
                            >
                              {new Date(
                                message.created_at ||
                                  message.timestamp ||
                                  Date.now()
                              ).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </small>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="chat-intro">
                      <p
                        style={{
                          color: "#202124",
                          fontSize: "14px",
                          textAlign: "center"
                        }}
                      >
                        Chưa có tin nhắn nào!
                      </p>
                    </div>
                  )}
                </div>
                <div className="mini-chat-footer">
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleImageChange}
                    ref={imageInputRef}
                    accept="image/*"
                  />
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                  {/* <div className="input-area"> */}
                  <button
                    className="mini-image-button"
                    onClick={triggerImageUpload}
                  >
                    <img
                      src={iconImage}
                      alt="Image Icon"
                      style={{ width: "20px" }}
                    />
                  </button>
                  <button
                    className="mini-file-button"
                    onClick={triggerFileUpload}
                  >
                    <img
                      src={iconAttach}
                      alt="Attach Icon"
                      style={{ width: "20px" }}
                    />
                  </button>
                  <div className="mini-message-input-wrapper">
                    {/* <div className="message-input-container"> */}
                    {selectedImage && (
                      <div
                        className="mini-selected-image-container"
                        style={{ marginBottom: "8px" }}
                      >
                        <img
                          src={URL.createObjectURL(selectedImage)}
                          alt="Ảnh đã chọn"
                          style={{
                            maxWidth: "50px",
                            maxHeight: "50px",
                            borderRadius: "4px"
                          }}
                        />
                        <IoCloseCircle
                          style={{
                            marginLeft: "8px",
                            cursor: "pointer",
                            color: "red"
                          }}
                          onClick={() => setSelectedImage(null)}
                        />
                      </div>
                    )}
                    {selectedFile && (
                      <div
                        className="mini-selected-preview"
                        style={{ marginBottom: "8px" }}
                      >
                        <div className="file-preview">
                          {getFileIconAndType(selectedFile.name).icon}
                          <div className="file-info">
                            <span className="file-name">
                              {selectedFile.name || "Tệp không tên"}
                            </span>
                            <span className="file-size">
                              {getFileIconAndType(selectedFile.name).type}{" "}
                              {" - " +
                                (selectedFile.size / 1024).toFixed(1) +
                                " KB"}
                            </span>
                          </div>
                        </div>
                        <IoCloseCircle
                          style={{
                            marginLeft: "8px",
                            cursor: "pointer",
                            color: "red"
                          }}
                          onClick={() => setSelectedFile(null)}
                        />
                      </div>
                    )}
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Nhập tin nhắn..."
                      className="mini-message-input"
                    />
                    {/* </div> */}
                  </div>
                  <button className="mini-send-button" onClick={sendMessage}>
                    <img src={iconSend} alt="Send Icon" />
                  </button>
                  {/* </div> */}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      <CallNotification />
      <div className="chat-container">
        <div className="header-chat">
          <div className="user-info">
            <img
              className="avatar"
              src={photos || "default"}
              alt="User Avatar"
            />
            <div className="user-details">
              <div className="user-name">{name || "User"}</div>
              <div className={`user-status ${onlineStatus}`}>
                {onlineStatus === "online" ? "Đang hoạt động" : "Ngoại tuyến"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex" }}>
            <button
              className="video-button mr-2"
              style={{ backgroundColor: "yellow" }}
              onClick={openReportModal}
            >
              <MdOutlineReport size={24} color="black" />
            </button>
            <button className="video-button" onClick={handleVideoCall}>
              <img src={iconcamera} alt="Icon Camera" className="camera-icon" />
              Gọi Video
            </button>
          </div>
        </div>
        <div className="body-chat" ref={chatBoxRef}>
          {loading && <p>Đang tải tin nhắn...</p>}
          {Array.isArray(messages) && messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${
                  message.senderId === (user.id || user._id)
                    ? "message-right"
                    : "message-left"
                }`}
              >
                {message.senderId !== (user.id || user._id) && (
                  <img
                    className="avatar"
                    src={photos || "default"}
                    alt="Receiver Avatar"
                  />
                )}
                <div className="message-content">
                  {(message.content || message.message) && (
                    <div className="message-text">
                      {message.content || message.message}
                    </div>
                  )}
                  {message.image && (
                    <div className="message-image">
                      <img
                        src={message.image.url || message.image}
                        alt="Hình ảnh"
                        style={{ maxWidth: "200px", borderRadius: "8px" }}
                        onError={(e) => {
                          console.log("Lỗi tải hình ảnh:", message.image);
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "block";
                        }}
                        onLoad={() =>
                          console.log("Hình ảnh đã tải:", message.image)
                        }
                      />
                      <span style={{ display: "none", color: "red" }}>
                        Không thể tải hình ảnh
                      </span>
                    </div>
                  )}
                  {message.file && (
                    <a
                      href={message.file.url || message.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="message-file-container"
                      download={
                        message.file.name || message.file.url.split("/").pop()
                      }
                    >
                      <div className="file-preview">
                        <FaFilePdf size={32} color="#FF5733" />
                        <div className="file-info">
                          <span className="file-name">
                            {message.file.name ||
                              message.file.url.split("/").pop() ||
                              "Tệp không tên"}
                          </span>
                          <span className="file-size">
                            {
                              getFileIconAndType(
                                message.file.name || message.file.url
                              ).type
                            }
                          </span>
                        </div>
                      </div>
                    </a>
                  )}
                  <small>
                    {new Date(
                      message.created_at || message.timestamp || Date.now()
                    ).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div className="chat-intro">
              <p className="chat-slogan">
                Bắt đầu trao đổi – cùng mở rộng giới hạn bản thân!
              </p>
            </div>
          )}
        </div>
        {!inCall && (
          <div className="footer-chat">
            <div className="input-area">
              <button className="image-button" onClick={triggerImageUpload}>
                <img src={iconImage} alt="Image Icon" />
              </button>
              <button className="file-button" onClick={triggerFileUpload}>
                <img src={iconAttach} alt="Attach Icon" />
              </button>

              <input
                type="file"
                style={{ display: "none" }}
                onChange={handleImageChange}
                ref={imageInputRef}
                accept="image/*"
              />
              <input
                type="file"
                style={{ display: "none" }}
                onChange={handleFileChange}
                ref={fileInputRef}
              />
              <div className="message-input-wrapper">
                <div className="message-input-container">
                  {selectedImage && (
                    <div className="selected-image-container">
                      <img
                        src={URL.createObjectURL(selectedImage)}
                        alt="Ảnh đã chọn"
                        className="selected-image"
                      />
                      <IoCloseCircle
                        className="remove-image"
                        onClick={() => setSelectedImage(null)}
                      />
                    </div>
                  )}
                  {selectedFile && (
                    <div className="selected-preview">
                      <div className="file-preview">
                        <FaFilePdf size={24} color="#FF5733" />
                        <div className="file-info">
                          <span className="file-name">
                            {selectedFile.name || "Tệp không tên"}
                          </span>
                          <span className="file-size">
                            {getFileIconAndType(selectedFile.name).type}
                            {" - " +
                              (selectedFile.size / 1024).toFixed(1) +
                              " KB"}
                            {/* {(selectedFile.size / 1024).toFixed(1)} KB */}
                          </span>
                        </div>
                      </div>
                      <IoCloseCircle
                        className="remove-preview"
                        onClick={() => setSelectedFile(null)}
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    className="message-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>

              <button className="send-button" onClick={sendMessage}>
                <img src={iconSend} alt="Send Icon" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeReportModal}
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-lg font-semibold mb-2">Báo cáo người dùng</h2>
          <p className="text-sm text-gray-600 mb-2">
            Vui lòng chọn lý do báo cáo:
          </p>
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full p-2 border rounded-lg mb-3"
          >
            <option value="">Chọn lý do</option>
            <option value="Hành vi không phù hợp">Hành vi không phù hợp</option>
            <option value="Spam">Spam</option>
            <option value="Quấy rối">Quấy rối</option>
            <option value="Nội dung không phù hợp">
              Nội dung không phù hợp
            </option>
          </select>
          {reportStatus && (
            <p className="text-sm text-red-500 mb-3">{reportStatus}</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={closeReportModal}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Hủy
            </button>
            <button
              onClick={handleReportSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Gửi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChatRoom;
