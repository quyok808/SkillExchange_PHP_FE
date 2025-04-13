import React, { useRef, useState } from "react";

const ProfilePanel = ({
  user,
  onClose,
  onChat,
  connectionStatus,
  onCancelRequest,
  onAcceptRequest,
  onRejectRequest,
  onBookAppointment,
  onConnect
}) => {
  const panelRef = useRef(null);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  if (!user) return null;

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
    setCurrentY(0); // Reset vị trí khi bắt đầu kéo
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const y = e.touches[0].clientY;
    const delta = y - startY;
    setCurrentY(delta); // Cập nhật vị trí hiện tại
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Nếu kéo xuống đủ xa (hơn 100px) thì đóng panel
    if (currentY > 100) {
      onClose();
      setCurrentY(0);
    }
    // Nếu kéo lên đủ xa (hơn 50px) thì reset về vị trí ban đầu
    else if (currentY < -50) {
      setCurrentY(0);
    }
  };

  // Thêm sự kiện mouse cho desktop
  const handleMouseDown = (e) => {
    setStartY(e.clientY);
    setCurrentY(0);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const y = e.clientY;
    const delta = y - startY;
    setCurrentY(delta);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (currentY > 100) {
      onClose();
      setCurrentY(0);
    } else if (currentY < -50) {
      setCurrentY(0);
    }
  };

  // Style cho panel
  const panelStyle = {
    transform: `translateY(${currentY}px)`,
    transition: isDragging
      ? "none"
      : "transform 0.3s cubic-bezier(0.2, 0, 0, 1)"
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-end"
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={isDragging ? handleMouseUp : undefined}
      onMouseLeave={isDragging ? handleMouseUp : undefined}
    >
      <div
        ref={panelRef}
        style={panelStyle}
        className="w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div
            className={`h-1.5 rounded-full transition-all duration-200 ${
              isDragging ? "w-16 bg-gray-400" : "w-12 bg-gray-300"
            }`}
          ></div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
        >
          ×
        </button>

        {/* Profile content */}
        <div className="p-6 pb-8 space-y-6">
          {/* Avatar section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={user.photo}
                alt="avatar"
                className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-800">
              {user.name}
            </h2>
            <p className="text-blue-600 font-medium">{user.email}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100"></div>

          {/* Contact info section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span className="text-gray-700">
                {user.phone || "Chưa có số điện thoại"}
              </span>
            </div>

            <div className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 mt-0.5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-gray-700 flex-1">
                {user.address || "Chưa có địa chỉ"}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100"></div>

          {/* Skills section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Kỹ năng
            </h3>

            {user.skills?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {skill.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Chưa có kỹ năng nào được thêm</p>
              </div>
            )}
          </div>

          {/* Action buttons section */}
          <div className="flex space-x-3 pt-2">
            {connectionStatus === "connected" ? (
              <>
                <button
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                  onClick={onBookAppointment}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Đặt lịch
                </button>
                <button
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                  onClick={onChat}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Nhắn tin
                </button>
              </>
            ) : connectionStatus === "pending_sent" ? (
              <button
                className="flex-1 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                onClick={onCancelRequest}
              >
                Hủy yêu cầu
              </button>
            ) : connectionStatus === "pending_received" ? (
              <>
                <button
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  onClick={onAcceptRequest}
                >
                  Chấp nhận
                </button>
                <button
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  onClick={onRejectRequest}
                >
                  Từ chối
                </button>
              </>
            ) : (
              <button
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                onClick={onConnect}
              >
                Kết nối
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
