package com.tradediary.follow;

import com.tradediary.trade.Trade;
import com.tradediary.trade.TradeRepository;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public Follow follow(Long followerId, Long followingId) {
        if (followerId.equals(followingId)) {
            throw new IllegalArgumentException("자기 자신은 팔로우할 수 없습니다.");
        }

        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("팔로우 사용자를 찾을 수 없습니다."));
        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new RuntimeException("팔로우 대상을 찾을 수 없습니다."));

        if (followRepository.findByFollowerIdAndFollowingId(followerId, followingId).isPresent()) {
            throw new IllegalStateException("이미 팔로우 중입니다.");
        }

        Follow follow = Follow.builder()
                .follower(follower)
                .following(following)
                .lastFollowerTradeNotifiedAt(
                        tradeRepository.findTopByUserIdOrderByTradedAtDescIdDesc(following.getId())
                                .map(Trade::getTradedAt)
                                .orElse(null)
                )
                .build();

        return followRepository.save(follow);
    }

    @Transactional
    public void unfollow(Long followerId, Long followingId) {
        followRepository.deleteByFollowerIdAndFollowingId(followerId, followingId);
    }

    @Transactional(readOnly = true)
    public boolean isFollowing(Long followerId, Long followingId) {
        return followRepository.findByFollowerIdAndFollowingId(followerId, followingId).isPresent();
    }

    @Transactional(readOnly = true)
    public Optional<Follow> getFollow(Long followerId, Long followingId) {
        return followRepository.findByFollowerIdAndFollowingId(followerId, followingId);
    }

    @Transactional
    public Follow updateTradeAlerts(Long followerId, Long followingId, boolean enabled) {
        Follow follow = followRepository.findByFollowerIdAndFollowingId(followerId, followingId)
                .orElseThrow(() -> new IllegalStateException("Follow this trader before enabling trade alerts."));
        var cursor = tradeRepository.findTopByUserIdOrderByTradedAtDescIdDesc(followingId)
                .map(Trade::getTradedAt).orElse(null);
        follow.updateTradeAlerts(enabled, cursor);
        if (enabled) {
            jdbcTemplate.update("""
                UPDATE exchange_sync_state
                SET priority=GREATEST(priority,80), status=CASE WHEN status='ACTION_REQUIRED' THEN status ELSE 'QUEUED' END,
                    next_sync_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
                WHERE user_id=?
                """, followingId);
        }
        return follow;
    }

    @Transactional(readOnly = true)
    public List<Follow> getMyFollowings(Long followerId) {
        return followRepository.findByFollowerIdOrderByCreatedAtDesc(followerId);
    }

    @Transactional(readOnly = true)
    public List<Follow> getFollowers(Long followingId) {
        return followRepository.findByFollowingIdOrderByCreatedAtDesc(followingId);
    }

    @Transactional(readOnly = true)
    public long getFollowingCount(Long followerId) {
        return followRepository.countByFollowerId(followerId);
    }

    @Transactional(readOnly = true)
    public long getFollowerCount(Long followingId) {
        return followRepository.countByFollowingId(followingId);
    }

    @Transactional(readOnly = true)
    public List<Follow> getFollowersWithFollower(Long followingId) {
        return followRepository.findTradeAlertSubscribers(followingId);
    }
}
