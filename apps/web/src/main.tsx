import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import StudioApp from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#b8ff5a', colorInfo: '#75e6ff', colorBgBase: '#090c12', borderRadius: 10, fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }, components: { Layout: { siderBg: '#0a0d14', headerBg: 'rgba(10,13,20,.82)' }, Card: { colorBgContainer: '#111722' }, Menu: { darkItemBg: '#0a0d14', darkItemSelectedBg: '#1d2a20', darkItemSelectedColor: '#c9ff7e' } } }}>
      <AntApp><BrowserRouter><StudioApp /></BrowserRouter></AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
