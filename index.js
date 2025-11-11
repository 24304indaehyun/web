// Firebase SDK (v11.6.1)
// Firebase 앱 SDK (필수)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// Firebase 인증 SDK (익명 로그인을 위해 필요)
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Firebase Realtime Database SDK (데이터 읽기용)
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// --------------------------------------------------------------------
// /* --- 1. 중요: 여기에 Firebase 웹 구성 붙여넣기 --- */
//
//    Firebase 콘솔 > 프로젝트 설정 > 내 앱 > SDK 설정 및 구성
//    에서 'firebaseConfig' 변수 내용을 복사하여 아래에 붙여넣으세요.
//
// --------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyChGJHdg8wwFJYcI-9T6DGBtiyTKuoRU9E",
  authDomain: "aisuhang-c3de2.firebaseapp.com",
  databaseURL: "https://aisuhang-c3de2-default-rtdb.firebaseio.com",
  projectId: "aisuhang-c3de2",
  storageBucket: "aisuhang-c3de2.firebasestorage.app",
  messagingSenderId: "1025948611403",
  appId: "1:1025948611403:web:bf2b4d47f9505105f86ece",
  measurementId: "G-YNP0ETRENS"
};

// UI 요소 가져오기
const statusEl = document.getElementById('status');
const logContainer = document.getElementById('log-container');

/**
 * 감정 문자열에 따라 다른 Tailwind CSS 클래스를 반환합니다.
 */
function getEmotionBadge(emotion) {
    const baseClasses = "inline-block text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full";
    switch (emotion.toUpperCase()) {
        case 'JOY':
            return `${baseClasses} bg-green-100 text-green-800`;
        case 'SAD':
            return `${baseClasses} bg-red-100 text-red-800`;
        case 'THINKING':
            return `${baseClasses} bg-yellow-100 text-yellow-800`;
        case 'SURPRISE':
            return `${baseClasses} bg-purple-100 text-purple-800`;
        case 'LISTENING':
            return `${baseClasses} bg-blue-100 text-blue-800`;
        case 'NEUTRAL':
        default:
            return `${baseClasses} bg-gray-200 text-gray-800`;
    }
}

/**
 * 아이콘 SVG
 */
const userIcon = `
    <svg class="w-6 h-6 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
    </svg>`;

const geminiIcon = `
    <svg class="w-6 h-6 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
    </svg>`;

/**
 * 로그 항목을 HTML로 렌더링합니다.
 */
function renderLogEntry(log) {
    // 타임스탬프를 한국 시간 형식으로 변환
    const timestamp = new Date(log.timestamp).toLocaleString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    return `
        <div class="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
            <!-- 헤더: 타임스탬프와 감정 -->
            <div class="flex justify-between items-center mb-3">
                <span class="text-sm text-gray-500">${timestamp}</span>
                <span class="${getEmotionBadge(log.emotion)}">${log.emotion}</span>
            </div>
            
            <!-- 대화 내용 -->
            <div class="space-y-3">
                <!-- 사용자 질문 -->
                <div class="flex items-start space-x-3">
                    ${userIcon}
                    <div class="bg-gray-100 p-3 rounded-lg rounded-tl-none w-full">
                        <p class="text-gray-800">${log.user}</p>
                    </div>
                </div>
                
                <!-- Gemini 응답 -->
                <div class="flex items-start space-x-3">
                    ${geminiIcon}
                    <div class="bg-indigo-50 p-3 rounded-lg rounded-bl-none w-full">
                        <p class="text-indigo-900">${log.gemini}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 메인 앱 실행 함수
 */
async function main() {
    try {
        // Firebase 앱 초기화
        statusEl.textContent = 'Firebase 초기화 중...';
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app);

        // 익명으로 로그인 (DB 읽기 권한을 위해)
        statusEl.textContent = '인증 중...';
        await signInAnonymously(auth);
        statusEl.textContent = '인증 성공. 데이터 수신 대기 중...';

        // 'logs' 경로의 데이터를 참조합니다.
        const logsRef = ref(db, 'logs');

        // onValue는 데이터가 변경될 때마다 (실시간으로) 호출됩니다.
        onValue(logsRef, (snapshot) => {
            const data = snapshot.val();
            
            if (data) {
                // 데이터를 배열로 변환하고 최신순으로 정렬 (reverse)
                const logs = Object.values(data).reverse();
                
                // 컨테이너 비우기
                logContainer.innerHTML = '';
                
                // 각 로그 항목을 HTML로 변환하여 삽입
                logs.forEach(log => {
                    logContainer.innerHTML += renderLogEntry(log);
                });
                
                statusEl.textContent = `연결 성공 (실시간 업데이트 중) - 총 ${logs.length}개 로그`;
            } else {
                logContainer.innerHTML = '<div class="p-8 text-center text-gray-500">아직 기록된 로그가 없습니다.</div>';
                statusEl.textContent = '연결 성공 (데이터 없음)';
            }
        }, (error) => {
            // 읽기 오류 처리
            console.error("Firebase 데이터 읽기 오류:", error);
            statusEl.textContent = `데이터 읽기 오류: ${error.message}`;
            logContainer.innerHTML = `<div class="p-8 text-center text-red-500">데이터를 불러오는 데 실패했습니다. Firebase DB 규칙(Rules)을 확인하세요.</div>`;
        });

    } catch (error) {
        console.error("Firebase 초기화 또는 인증 오류:", error);
        statusEl.textContent = `Firebase 연결 오류: ${error.message}`;
        if (error.message.includes("API key")) {
            logContainer.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Firebase 구성(firebaseConfig)이 올바르지 않습니다. 스크립트에서 1번 항목을 확인해주세요.</div>`;
        }
    }
}

// 앱 실행
main();
