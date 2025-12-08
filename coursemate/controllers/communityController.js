const mariadb = require('mariadb');
require('dotenv').config();

const pool = require('../database');

// 1. 공지사항 목록 조회 (로그인 불필요)
exports.getNotices = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT NOTICE_ID, TITLE, REG_DATE FROM NOTICE ORDER BY REG_DATE DESC");

    res.status(200).json({
      result_code: 200,
      result_msg: "공지사항 목록 조회 성공",
      notices: rows.map(row => ({
        id: row.NOTICE_ID,
        title: row.TITLE,
        regDate: row.REG_DATE
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// 2. 공지사항 상세 조회
exports.getNoticeDetail = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT * FROM NOTICE WHERE NOTICE_ID = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ result_code: 404, result_msg: "공지사항이 없습니다." });
    }

    // ★ [핵심] 대문자 DB 컬럼명을 소문자로 변환해서 응답
    const notice = rows[0];
    const formattedNotice = {
        id: notice.NOTICE_ID,
        title: notice.TITLE,
        content: notice.CONTENT,
        regDate: notice.REG_DATE
    };

    res.status(200).json({
      result_code: 200,
      result_msg: "상세 조회 성공",
      notice: formattedNotice // 변환된 데이터 전달
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// 3. 문의/피드백 등록 (POST)
exports.createInquiry = async (req, res) => {
  let conn;
  try {
    // ✨ [수정] 토큰에서 ID 꺼내기
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ result_code: 401, result_msg: "로그인이 필요합니다." });
    }
    const userId = req.user.userId;
    const { title, content } = req.body;

    const inquiryId = 'INQ' + Date.now();

    conn = await pool.getConnection();

    await conn.query(
      "INSERT INTO INQUIRY (INQUIRY_ID, USER_ID, TITLE, CONTENT, STATUS, REG_DATE) VALUES (?, ?, ?, ?, ?, NOW())",
      [inquiryId, userId, title, content, '대기']
    );

    res.status(200).json({
      result_code: 200,
      result_msg: "문의 등록 성공",
      inquiryId: inquiryId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// 4. 내 문의 내역 조회 (GET)
exports.getMyFeedbacks = async (req, res) => {
  let conn;
  try {
    // ✨ [수정] 토큰에서 ID 꺼내기
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ result_code: 401, result_msg: "로그인이 필요합니다." });
    }
    const userId = req.user.userId;

    conn = await pool.getConnection();

    const rows = await conn.query(
      "SELECT INQUIRY_ID, TITLE, STATUS, REG_DATE, ANSWER_DATE, ANSWER_CONTENT FROM INQUIRY WHERE USER_ID = ? ORDER BY REG_DATE DESC",
      [userId]
    );

    res.status(200).json({
      result_code: 200,
      result_msg: "내 문의 조회 성공",
      feedbacks: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// 5. [관리자용] 전체 문의 조회 (이미 잘 구현되어 있을 경우 유지)
exports.getAllInquiries = async (req, res) => {
   // ... (기존 코드 유지)
   let conn;
   try {
     conn = await pool.getConnection();
     const query = `
       SELECT i.INQUIRY_ID as id, u.NAME as userNickname, i.TITLE as title, 
              i.CONTENT as content, i.STATUS as status, i.REG_DATE as createdAt
       FROM INQUIRY i
       LEFT JOIN USER u ON i.USER_ID = u.USER_ID
       ORDER BY i.REG_DATE DESC
     `;
     const rows = await conn.query(query);
     res.status(200).json({ result_code: 200, feedbacks: rows });
   } catch (err) {
     console.error(err);
     res.status(500).json({ result_code: 500 });
   } finally {
     if (conn) conn.end();
   }
};

// 6. [관리자용] 공지사항 등록
exports.createNotice = async (req, res) => {
    let conn;
    try {
        const { title, content } = req.body;
        const noticeId = 'NOTI' + Date.now();
        conn = await pool.getConnection();
        await conn.query("INSERT INTO NOTICE (NOTICE_ID, TITLE, CONTENT, REG_DATE) VALUES (?, ?, ?, NOW())", [noticeId, title, content]);
        res.status(200).json({ result_code: 200, result_msg: "등록 성공" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ result_code: 500 });
    } finally {
        if(conn) conn.end();
    }
};

// 7. [관리자용] 공지사항 삭제
exports.deleteNotice = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        conn = await pool.getConnection();
        await conn.query("DELETE FROM NOTICE WHERE NOTICE_ID = ?", [id]);
        res.status(200).json({ result_code: 200, result_msg: "삭제 성공" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ result_code: 500 });
    } finally {
        if(conn) conn.end();
    }
};