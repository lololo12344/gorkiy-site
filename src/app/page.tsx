'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { MenuView } from '@/components/MenuView';
import { ProfileView } from '@/components/ProfileView';
import { LocationModal } from '@/components/LocationModal';
import { OrderStatusModal } from '@/components/OrderStatusModal';

function MainContent() {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <div className="flex-1">
        {activeTab === 'menu' ? <MenuView /> : <ProfileView />}
      </div>
      <BottomNav />

      {/* Глобальные модальные окна, доступные со всех вкладок */}
      <LocationModal />
      <OrderStatusModal />
    </div>
  );
}

export default function Home() {
  return <MainContent />;
}
