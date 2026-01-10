// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

import Splash from "./pages/Splash.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Home from "./pages/Home.jsx";
import TendencyInfo from "./pages/TendencyInfo.jsx";
import Mypage from "./pages/Mypage.jsx";
import MyCalendar from "./pages/MyCalendar.jsx";

import JoinedTeamPlace from "./pages/JoinedTeamPlace.jsx";
import TeamCreate from "./pages/TeamCreate.jsx"; // ✅ 추가
import TeamJoin from "./pages/TeamJoin.jsx"; // ✅ 추가

import Customize from "./pages/Customize.jsx";
import TeamCalendar from "./pages/TeamCalendar.jsx";
import TeamPlaceHome from "./pages/TeamPlaceHome.jsx";
import RoomManagement from "./pages/RoomManagement.jsx";
import MemberRemoval from "./pages/MemberRemoval.jsx";
import RoomRemoval from "./pages/RoomRemoval.jsx";
import SpecificTeamPlans from "./pages/SpecificTeamPlans.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<Home />} />
      <Route path="/tendency" element={<TendencyInfo />} />
      <Route path="/mypage" element={<Mypage />} />
      <Route path="/mycalendar" element={<MyCalendar />} />
      <Route path="/customize" element={<Customize />} />

      {/* ✅ TeamPlace 라우팅 (핵심) */}
      <Route path="/teamplace" element={<JoinedTeamPlace />} />
      <Route path="/teamplace/create" element={<TeamCreate />} />
      <Route path="/teamplace/join" element={<TeamJoin />} />

      {/* (선택) 예전 링크도 살리고 싶으면 같이 두기 */}
      <Route path="/joinedteamplace" element={<JoinedTeamPlace />} />

      {/* ✅ teamId를 URL로 들고 다니기 */}
      <Route path="/teamplacehome/:teamId" element={<TeamPlaceHome />} />
      <Route path="/roommanagement/:teamId" element={<RoomManagement />} />
      <Route path="/memberremoval/:teamId" element={<MemberRemoval />} />
      <Route path="/roomremoval/:teamId" element={<RoomRemoval />} />
      <Route path="/teamcalendar/:teamId" element={<TeamCalendar />} />
      <Route
        path="/specificteamplans/:teamId"
        element={<SpecificTeamPlans />}
      />
    </Routes>
  );
}
