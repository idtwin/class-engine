"use client";

import React from 'react';
import UniversalScoreboardHUD from './HUD/UniversalScoreboardHUD';
import BroadcastViewModal from './HUD/BroadcastViewModal';
import PlayerPickerModal from './PlayerPickerModal';

export default function ScoreboardOverlay() {
  return (
    <>
      <UniversalScoreboardHUD />
      <BroadcastViewModal />
      <PlayerPickerModal />
    </>
  );
}
