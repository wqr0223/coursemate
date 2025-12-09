const mariadb = require('mariadb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = require('../database');

// Helper: DB에서 태그 ID 찾기
async function getTagIdByName(conn, tagName) {
  const rows = await conn.query("SELECT TAG_ID FROM TAG WHERE TAG_NAME = ?", [tagName]);
  return rows.length > 0 ? rows[0].TAG_ID : null;
}

// 0. 전체 태그 목록 조회
exports.getAllTags = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT TAG_ID, TAG_NAME FROM TAG ORDER BY TAG_ID");
    res.status(200).json({
      result_code: 200,
      result_msg: "전체 태그 목록 조회 성공",
      tags: rows.map(r => r.TAG_NAME)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// 1. 내 취향 태그 조회 (GET)
exports.getMyPreferences = async (req, res) => {
  let conn;
  try {
    // ✨ [수정] 미들웨어가 검증한 req.user에서 ID 꺼내기
    // req.user가 없다면(미들웨어 누락 등) 에러 방지를 위해 방어 코드 추가
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ result_code: 401, result_msg: "유효하지 않은 인증 정보입니다." });
    }
    const userId = req.user.userId;

    conn = await pool.getConnection();
    const rows = await conn.query(
      "SELECT t.TAG_NAME FROM USER_PREFERENCE up JOIN TAG t ON up.TAG_ID = t.TAG_ID WHERE up.USER_ID = ?",
      [userId]
    );

    res.status(200).json({
      result_code: 200,
      result_msg: "내 취향 조회 성공",
      tags: rows.map(r => r.TAG_NAME)
    });
  } catch (err) {
    console.error("getMyPreferences Error:", err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// 2. 내 취향 태그 설정 (POST)
exports.setMyPreferences = async (req, res) => {
  let conn;
  try {
    // ✨ [수정] 토큰에서 userId 안전하게 꺼내기
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ result_code: 401, result_msg: "유효하지 않은 인증 정보입니다." });
    }
    const userId = req.user.userId;
    const { tags } = req.body; 

    if (!tags) return res.status(400).json({ result_code: 400, result_msg: "태그 데이터 없음" });

    conn = await pool.getConnection();

    // 기존 태그 삭제 후 새로 추가 (트랜잭션 권장)
    await conn.query("DELETE FROM USER_PREFERENCE WHERE USER_ID = ?", [userId]);

    if (tags.length > 0) {
      for (const tagName of tags) {
        const tagIdRows = await conn.query("SELECT TAG_ID FROM TAG WHERE TAG_NAME = ?", [tagName]);
        if (tagIdRows.length > 0) {
          const tagId = tagIdRows[0].TAG_ID;
          // ✨ [중요] userId가 undefined면 여기서 SQL 에러가 났던 것임
          await conn.query("INSERT INTO USER_PREFERENCE (USER_ID, TAG_ID) VALUES (?, ?)", [userId, tagId]);
        }
      }
    }

    res.status(200).json({ result_code: 200, result_msg: "취향 태그 설정 성공" });
  } catch (err) {
    console.error("setMyPreferences Error:", err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// 3. 내 정보 조회 (GET /me/settings)
exports.getMySettings = async (req, res) => {
  let conn;
  try {
    // ✨ [수정] req.user 안전하게 사용
    const userId = req.user ? req.user.userId : null;
    if (!userId) return res.status(401).json({ result_code: 401, result_msg: "로그인 필요" });

    conn = await pool.getConnection();
    const rows = await conn.query("SELECT NAME, EMAIL, AGE, GENDER, IS_ACTIVE FROM USER WHERE USER_ID = ?", [userId]);

    if (rows.length === 0) return res.status(404).json({ result_code: 404, result_msg: "사용자 없음" });

    res.status(200).json({
      result_code: 200,
      setting: {
        name: rows[0].NAME,
        email: rows[0].EMAIL,
        age: rows[0].AGE,
        gender: rows[0].GENDER,
        is_active: rows[0].IS_ACTIVE
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// 4. 내 정보 수정 (설정 저장 포함)
exports.updateMyInfo = async (req, res) => {
  let conn;
  try {
    const userId = req.user.userId;
    // autoLogin, notification 등 추가 필드도 받음
    const { name, age, gender, password, autoLogin, notification } = req.body;

    conn = await pool.getConnection();

    // 1) 비밀번호 변경이 있는 경우
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await conn.query(
        "UPDATE USER SET NAME=?, AGE=?, GENDER=?, PASSWORD=? WHERE USER_ID=?", 
        [name, age, gender, hashedPassword, userId]
      );
    } 
    // 2) 비밀번호 변경 없는 경우
    else {
      await conn.query(
        "UPDATE USER SET NAME=?, AGE=?, GENDER=? WHERE USER_ID=?", 
        [name, age, gender, userId]
      );
    }

    // ★ 3) 알림 설정 등 저장 (USER 테이블에 해당 컬럼이 있다고 가정)
    // 컬럼이 없다면 이 부분은 에러가 날 수 있으니 DB에 'NOTIFICATION' 컬럼을 추가하거나 주석 처리하세요.
    // await conn.query("UPDATE USER SET NOTIFICATION=? WHERE USER_ID=?", [notification ? 1 : 0, userId]);

    res.status(200).json({ result_code: 200, result_msg: "수정 성공" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// 5. 회원 탈퇴 (비밀번호 확인 없이 탈퇴 가능하게 임시 수정)
exports.deleteAccount = async (req, res) => {
  let conn;
  try {
    const userId = req.user.userId;
    // const { password } = req.body; // 비밀번호 받는 부분 생략

    conn = await pool.getConnection();
    
    // 비밀번호 확인 로직 주석 처리 (프론트에서 비밀번호 입력받기 귀찮을 때)
    /*
    const rows = await conn.query("SELECT PASSWORD FROM USER WHERE USER_ID = ?", [userId]);
    const isMatch = await bcrypt.compare(password, rows[0].PASSWORD);
    if (!isMatch) return res.status(200).json({ result_code: 401, result_msg: "비밀번호 불일치" });
    */

    await conn.query("DELETE FROM USER WHERE USER_ID = ?", [userId]);
    res.status(200).json({ result_code: 200, result_msg: "탈퇴 성공" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// ★ 6. 내 리뷰 조회 (GET /me/reviews) - 새로 추가된 부분
exports.getMyReviews = async (req, res) => {
  let conn;
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ result_code: 401, result_msg: "로그인이 필요합니다." });
    }
    const userId = req.user.userId;

    conn = await pool.getConnection();
    // 리뷰 정보와 해당 관광지 이름(spotName)을 같이 조회
    const query = `
      SELECT r.REVIEW_ID as reviewId, r.CONTENT as content, r.RATING as rating, r.REG_DATE as regDate, 
             t.NAME as spotName, t.SPOT_ID as spotId
      FROM REVIEW r
      JOIN TOUR_SPOT t ON r.SPOT_ID = t.SPOT_ID
      WHERE r.USER_ID = ?
      ORDER BY r.REG_DATE DESC
    `;
    const rows = await conn.query(query, [userId]);

    res.status(200).json({
      result_code: 200,
      result_msg: "내 리뷰 조회 성공",
      reviews: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// ★ 7. 위시리스트 조회 (GET /me/wishlist)
exports.getWishlist = async (req, res) => {
  let conn;
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ result_code: 401, result_msg: "로그인이 필요합니다." });
    }
    const userId = req.user.userId;

    conn = await pool.getConnection();
    // 찜한 관광지 정보(ID, 이름, 주소, 이미지 등)를 같이 가져옵니다.
    const query = `
      SELECT w.WISHLIST_ID as wishId, t.SPOT_ID as placeId, t.NAME as placeName, t.ADDRESS as address, p.IMG_URL as thumbnail
      FROM WISHLIST w
      JOIN TOUR_SPOT t ON w.SPOT_ID = t.SPOT_ID
      LEFT JOIN (
          SELECT SPOT_ID, IMG_URL 
          FROM PHOTO 
          GROUP BY SPOT_ID
      ) p ON t.SPOT_ID = p.SPOT_ID
      WHERE w.USER_ID = ?
      ORDER BY w.REG_DATE DESC
    `;
    const rows = await conn.query(query, [userId]);

    res.status(200).json({
      result_code: 200,
      result_msg: "위시리스트 조회 성공",
      wishlist: rows
    });
  } catch (err) {
    console.error("getWishlist Error:", err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// ★ 8. 위시리스트 추가/삭제 토글 (POST /me/wishlist)
exports.toggleWishlist = async (req, res) => {
  let conn;
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ result_code: 401, result_msg: "로그인이 필요합니다." });
    }
    const userId = req.user.userId;
    const { placeId } = req.body; // 프론트에서 placeId를 보냄

    if (!placeId) {
      return res.status(400).json({ result_code: 400, result_msg: "관광지 ID가 필요합니다." });
    }

    conn = await pool.getConnection();

    // 이미 찜했는지 확인
    const checkQuery = "SELECT WISHLIST_ID FROM WISHLIST WHERE USER_ID = ? AND SPOT_ID = ?";
    const rows = await conn.query(checkQuery, [userId, placeId]);

    if (rows.length > 0) {
      // 이미 있으면 삭제 (Un-wish)
      await conn.query("DELETE FROM WISHLIST WHERE USER_ID = ? AND SPOT_ID = ?", [userId, placeId]);
      res.status(200).json({ result_code: 200, result_msg: "위시리스트에서 삭제되었습니다.", action: "removed" });
    } else {
      // 없으면 추가 (Wish)
      const wishId = 'WISH' + Date.now();
      await conn.query("INSERT INTO WISHLIST (WISHLIST_ID, USER_ID, SPOT_ID, REG_DATE) VALUES (?, ?, ?, NOW())", [wishId, userId, placeId]);
      res.status(200).json({ result_code: 200, result_msg: "위시리스트에 추가되었습니다.", action: "added" });
    }

  } catch (err) {
    console.error("toggleWishlist Error:", err);
    res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
  } finally {
    if (conn) conn.end();
  }
};

// ★ 9. 위시리스트 삭제 (DELETE /me/wishlist/:placeId) - 명시적 삭제용
exports.removeWishlist = async (req, res) => {
    let conn;
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ result_code: 401, result_msg: "로그인이 필요합니다." });
      }
      const userId = req.user.userId;
      const { placeId } = req.params;
  
      conn = await pool.getConnection();
      await conn.query("DELETE FROM WISHLIST WHERE USER_ID = ? AND SPOT_ID = ?", [userId, placeId]);
      
      res.status(200).json({ result_code: 200, result_msg: "삭제 성공" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ result_code: 500, result_msg: "서버 오류" });
    } finally {
      if (conn) conn.end();
    }
  };