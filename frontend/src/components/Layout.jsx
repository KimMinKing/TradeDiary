// [파일 용도] 인증된 페이지의 공통 레이아웃 (Navbar 포함)

import Navbar from './Navbar';

// [컴포넌트] private 페이지 공통 래퍼 / [호출] App.jsx
const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

export default Layout;
