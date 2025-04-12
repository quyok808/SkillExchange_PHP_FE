/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import UserCard from "../../components/UserCard";
import styles from "../Search/Search.module.css";
import userService from "../../services/user.service";
import Loading from "./../../components/Loading/index";
import { debounce } from "lodash";
import Toast from "../../utils/Toast";

function SearchPage() {
  const [state, setState] = useState({
    skillName: "",
    name: "",
    email: "",
    selectedOptions: [],
    users: [],
    loading: false,
    error: null,
    provinces: [],
    selectedProvince: "",
    currentPage: 1,
    totalPages: 1
  });
  const itemsPerPage = 10;

  const fetchWithErrorHandling = async (fetchFn, errorMessage, signal) => {
    try {
      const response = await fetchFn({ signal });
      return response.data || response;
    } catch (error) {
      if (!signal.aborted) console.error(errorMessage, error);
      throw error;
    }
  };

  const fetchInitialData = async (signal) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const [provincesData, usersData] = await Promise.all([
        fetchWithErrorHandling(
          () => fetch("https://provinces.open-api.vn/api/p/"),
          "Error fetching provinces:",
          signal
        ).then((res) => res.json()),
        fetchWithErrorHandling(
          () => userService.searchUser({ page: 1, limit: itemsPerPage }),
          "Error fetching users:",
          signal
        )
      ]);

      setState((prev) => ({
        ...prev,
        provinces: provincesData || [],
        users: usersData?.users || [],
        totalPages: usersData?.totalPages || 1,
        currentPage: usersData?.page || 1,
        loading: false
      }));
    } catch (error) {
      if (!signal.aborted) {
        setState((prev) => ({
          ...prev,
          error: "Lỗi tải dữ liệu ban đầu",
          loading: false
        }));
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchInitialData(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchUsers = useCallback(
    async (page = 1) => {
      console.log("fetchUsers - Called with page:", page); // Debug
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const controller = new AbortController();
      const params = {
        page,
        limit: itemsPerPage,
        ...(state.skillName && { skillName: state.skillName }),
        ...(state.name && { name: state.name }),
        ...(state.email && { email: state.email }),
        ...(state.selectedProvince && {
          address: state.provinces.find(
            (p) => p.code === parseInt(state.selectedProvince)
          )?.name
        }),
        ...(state.selectedOptions.length > 0 && {
          skills: state.selectedOptions.join(",")
        })
      };

      try {
        const data = await fetchWithErrorHandling(
          () => userService.searchUser(params),
          "Error searching users:",
          controller.signal
        );
        console.log("fetchUsers - API response:", data); // Debug
        if (data.status === "success") {
          console.log("fetchUsers - Updating users:", data.users); // Debug
          setState((prev) => ({
            ...prev,
            users: data.users,
            totalPages: data.totalPages,
            currentPage: data.page,
            loading: false
          }));
        } else {
          console.log("fetchUsers - API error:", data); // Debug
          setState((prev) => ({
            ...prev,
            error: "Không thể tải dữ liệu",
            loading: false
          }));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("fetchUsers - Error:", err); // Debug
          setState((prev) => ({
            ...prev,
            error:
              err.status === 401
                ? "Phiên đăng nhập hết hạn"
                : err.message || "Lỗi tải dữ liệu",
            loading: false
          }));
        }
      }
    },
    [
      state.skillName,
      state.name,
      state.email,
      state.selectedProvince,
      state.selectedOptions
    ]
  );

  const debouncedFetchUsers = useCallback(debounce(fetchUsers, 300), [
    fetchUsers
  ]);

  const handleSearch = () => debouncedFetchUsers(1);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= state.totalPages) fetchUsers(newPage);
  };

  return (
    <>
      <div className={styles.searchContainer}>
        <h1 className={styles.title}>Tìm kiếm người trao đổi kỹ năng</h1>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Nhập kỹ năng bạn muốn học"
            value={state.skillName}
            onChange={(e) =>
              setState((prev) => ({ ...prev, skillName: e.target.value }))
            }
            className={styles.searchInput}
          />
          <input
            type="text"
            placeholder="Nhập tên người dùng"
            value={state.name}
            onChange={(e) =>
              setState((prev) => ({ ...prev, name: e.target.value }))
            }
            className={styles.searchInput}
          />
          <input
            type="email"
            placeholder="Nhập email"
            value={state.email}
            onChange={(e) =>
              setState((prev) => ({ ...prev, email: e.target.value }))
            }
            className={styles.searchInput}
          />
          <button onClick={handleSearch} className={styles.searchButton}>
            Tìm kiếm
          </button>
        </div>

        <div className={styles.searchFilter}>
          <select
            value={state.selectedProvince}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                selectedProvince: e.target.value
              }))
            }
            className={styles.locationSelect}
          >
            <option value="">Chọn tỉnh/thành phố</option>
            {state.provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.wrapper}>
        {state.error && <div className={styles.error}>{state.error}</div>}
        {!state.loading && !state.error && state.users.length === 0 && (
          <div>Không tìm thấy kết quả nào</div>
        )}
        {!state.loading && !state.error && state.users.length !== 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.cardContainer}>
              {state.users.map((user) => (
                <UserCard
                  key={user._id}
                  name={user.name}
                  skills={
                    user.skills.length > 0
                      ? user.skills.map((skill) => skill.name).join(", ")
                      : "Chưa có kỹ năng"
                  }
                  address={user.address || "Chưa cập nhật địa chỉ"}
                  avatar={user.photo || "default-avatar-url"}
                  userid={user._id}
                />
              ))}
            </div>
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange(state.currentPage - 1)}
                disabled={state.currentPage === 1}
                className={styles.pageButton}
              >
                Trước
              </button>
              <span className={styles.pageInfo}>
                Trang {state.currentPage} / {state.totalPages}
                (Tổng: {state.users.length} kết quả)
              </span>
              <button
                onClick={() => handlePageChange(state.currentPage + 1)}
                disabled={state.currentPage === state.totalPages}
                className={styles.pageButton}
              >
                Sau
              </button>
            </div>
          </div>
        )}
        {state.loading && (
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
              zIndex: 1000
            }}
          >
            <Loading />
          </div>
        )}
      </div>
    </>
  );
}

export default SearchPage;
