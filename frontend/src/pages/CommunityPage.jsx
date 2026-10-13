import { useState } from 'react';
import CommunityBoard from '../components/community/CommunityBoard';
import FollowingFeed from '../components/community/FollowingFeed';
import '../styles/community.css';
import { useLocale } from '../i18n/localeContext';

const CommunityPage = () => {
  const [view, setView] = useState('discussions');
  const { t } = useLocale();
  return (
    <div className="page community-page">
      <div className="community-view-switch"><button className={view === 'discussions' ? 'active' : ''} onClick={() => setView('discussions')}>{t('Discussions')}</button><button className={view === 'following' ? 'active' : ''} onClick={() => setView('following')}>{t('Following')}</button></div>
      {view === 'discussions' ? <CommunityBoard /> : <FollowingFeed />}
    </div>
  );
};

export default CommunityPage;
