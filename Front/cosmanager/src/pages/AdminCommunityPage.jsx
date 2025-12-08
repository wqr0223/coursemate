// src/pages/AdminCommunityPage.jsx
import React, { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import {
  fetchNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  fetchFeedbacks,
  updateFeedbackStatus,
  deleteFeedback,
} from "../api/adminCommunity.js";

// ✨ [수정] pinned 제거
const EMPTY_NOTICE_FORM = {
  title: "",
  content: "",
};

const AdminCommunityPage = () => {
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticesError, setNoticesError] = useState("");
  const [noticeForm, setNoticeForm] = useState(EMPTY_NOTICE_FORM);
  const [editingNoticeId, setEditingNoticeId] = useState(null);

  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [feedbacksError, setFeedbacksError] = useState("");

  const loadNotices = async () => {
    setNoticesLoading(true);
    setNoticesError("");
    try {
      const data = await fetchNotices();
      // ✨ [중요] API에서 배열을 바로 리턴하도록 수정했으므로 그대로 사용
      setNotices(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setNoticesError("공지사항 목록을 불러오지 못했습니다.");
      setNotices([]);
    } finally {
      setNoticesLoading(false);
    }
  };

  const loadFeedbacks = async () => {
    setFeedbacksLoading(true);
    setFeedbacksError("");
    try {
      const data = await fetchFeedbacks();
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setFeedbacksError("이용자 의견 목록을 불러오지 못했습니다.");
      setFeedbacks([]);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
    loadFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeNoticeForm = (e) => {
    const { name, value } = e.target;
    setNoticeForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetNoticeForm = () => {
    setNoticeForm(EMPTY_NOTICE_FORM);
    setEditingNoticeId(null);
  };

  const handleSubmitNoticeForm = async (e) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.content) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      if (editingNoticeId == null) {
        await createNotice(noticeForm);
      } else {
        await updateNotice(editingNoticeId, noticeForm);
      }
      resetNoticeForm();
      await loadNotices();
    } catch (e) {
      console.error(e);
      alert("공지사항 저장에 실패했습니다.");
    }
  };

  const handleEditNotice = (notice) => {
    setEditingNoticeId(notice.id);
    setNoticeForm({
      title: notice.title ?? "",
      content: notice.content ?? "",
      // pinned 제거됨
    });
  };

  const handleDeleteNotice = async (notice) => {
    if (!window.confirm(`'${notice.title}' 공지사항을 삭제할까요?`)) return;
    try {
      await deleteNotice(notice.id);
      await loadNotices();
    } catch (e) {
      console.error(e);
      alert("공지사항 삭제에 실패했습니다.");
    }
  };

  const handleChangeFeedbackStatus = async (feedback, nextStatus) => {
    if (!window.confirm(`선택한 의견의 상태를 '${nextStatus}'로 변경할까요?`)) return;
    try {
      await updateFeedbackStatus(feedback.id, nextStatus);
      await loadFeedbacks();
    } catch (e) {
      console.error(e);
      alert("상태 변경에 실패했습니다.");
    }
  };

  const handleDeleteFeedback = async (feedback) => {
    if (!window.confirm("해당 의견을 삭제할까요?")) return;
    try {
      await deleteFeedback(feedback.id);
      await loadFeedbacks();
    } catch (e) {
      console.error(e);
      alert("의견 삭제에 실패했습니다.");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: "24px" }}>
        <h1 style={{ fontSize: "20px", marginBottom: "12px" }}>커뮤니티 관리</h1>

        <section style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>공지사항 관리</h2>

          {noticesLoading && <div style={{ fontSize: "13px" }}>공지사항 불러오는 중...</div>}
          {noticesError && (
            <div style={{ fontSize: "13px", color: "#ff6b6b", marginBottom: "8px" }}>
              {noticesError}
            </div>
          )}

          <div style={{ overflowX: "auto", marginBottom: "12px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                minWidth: "640px",
              }}
            >
              <thead>
                <tr>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>ID</th>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>제목</th>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>등록일</th>
                  {/* ✨ [수정] 상단 고정 컬럼 제거 */}
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((n) => (
                  <tr key={n.id}>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>{n.id}</td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>{n.title}</td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>
                      {/* ✨ [수정] createdAt -> regDate (백엔드 변수명 사용) */}
                      {n.regDate ? new Date(n.regDate).toLocaleDateString() : "-"}
                    </td>
                    {/* ✨ [수정] 상단 고정 데이터 제거 */}
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>
                      <button
                        type="button"
                        onClick={() => handleEditNotice(n)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid #444",
                          backgroundColor: "#111",
                          fontSize: "12px",
                          marginRight: "4px",
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(n)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid #703030",
                          backgroundColor: "#2a0000",
                          fontSize: "12px",
                        }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}

                {!noticesLoading && notices.length === 0 && (
                  <tr>
                    <td
                      colSpan={4} // ✨ 컬럼 수 조정 (5 -> 4)
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        color: "#aaa",
                        borderBottom: "1px solid #333",
                      }}
                    >
                      등록된 공지사항이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              borderRadius: "10px",
              border: "1px solid #333",
              padding: "12px",
              backgroundColor: "#111",
              maxWidth: "640px",
            }}
          >
            <h3 style={{ fontSize: "14px", marginTop: 0 }}>
              {editingNoticeId == null ? "새 공지사항 등록" : `공지사항 수정 (ID: ${editingNoticeId})`}
            </h3>
            <form onSubmit={handleSubmitNoticeForm}>
              <div style={{ marginBottom: "8px" }}>
                <label style={{ fontSize: "13px" }}>
                  제목
                  <input
                    type="text"
                    name="title"
                    value={noticeForm.title}
                    onChange={handleChangeNoticeForm}
                    style={{
                      marginTop: "4px",
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #444",
                      backgroundColor: "#000",
                      color: "#f5f5f5",
                      fontSize: "13px",
                    }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <label style={{ fontSize: "13px" }}>
                  내용
                  <textarea
                    name="content"
                    value={noticeForm.content}
                    onChange={handleChangeNoticeForm}
                    rows={4}
                    style={{
                      marginTop: "4px",
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #444",
                      backgroundColor: "#000",
                      color: "#f5f5f5",
                      fontSize: "13px",
                      resize: "vertical",
                    }}
                  />
                </label>
              </div>
              
              {/* ✨ [수정] 상단 고정 체크박스 제거 */}

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  type="submit"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    backgroundColor: "#f5f5f5",
                    color: "#000",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {editingNoticeId == null ? "등록" : "수정 저장"}
                </button>
                {editingNoticeId != null && (
                  <button
                    type="button"
                    onClick={resetNoticeForm}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #444",
                      backgroundColor: "#111",
                      fontSize: "13px",
                    }}
                  >
                    새 공지 등록 모드로
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        <section>
          {/* 이용자 의견 섹션은 기존 코드 유지 */}
          <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>이용자 의견 관리</h2>
          {/* ... (생략, 위에서 받은 feedbacks 데이터가 배열로 잘 들어오므로 렌더링 잘 될 것임) */}
          {/* feedbacks 렌더링 부분은 수정 불필요 (단, feedbacks 변수는 loadFeedbacks에서 처리됨) */}
          {feedbacksLoading && (
            <div style={{ fontSize: "13px" }}>이용자 의견 불러오는 중...</div>
          )}
          {feedbacksError && (
            <div style={{ fontSize: "13px", color: "#ff6b6b", marginBottom: "8px" }}>
              {feedbacksError}
            </div>
          )}
          
          {/* 아래 테이블 렌더링 코드는 기존 파일 내용을 그대로 쓰시면 됩니다. */}
          {/* 생략된 부분은 기존 코드와 동일합니다. */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "760px" }}>
               <thead>
                <tr>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>ID</th>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>작성자</th>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>제목</th>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>내용</th>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>등록일</th>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>상태</th>
                  <th style={{ padding: "6px", borderBottom: "1px solid #444", textAlign: "left" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((f) => (
                  <tr key={f.id}>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>{f.id}</td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>{f.userNickname}</td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>{f.title}</td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>{f.content}</td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>{f.createdAt}</td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>{f.status}</td>
                    <td style={{ padding: "6px", borderBottom: "1px solid #333" }}>
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          handleChangeFeedbackStatus(f, e.target.value);
                        }}
                        style={{
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #444",
                          backgroundColor: "#111",
                          color: "#f5f5f5",
                          fontSize: "12px",
                          marginRight: "4px",
                        }}
                      >
                        <option value="">상태 변경</option>
                        <option value="new">new</option>
                        <option value="processing">processing</option>
                        <option value="done">done</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteFeedback(f)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid #703030",
                          backgroundColor: "#2a0000",
                          fontSize: "12px",
                        }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                 {!feedbacksLoading && feedbacks.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "8px", textAlign: "center", color: "#aaa", borderBottom: "1px solid #333" }}>
                      등록된 이용자 의견이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminCommunityPage;