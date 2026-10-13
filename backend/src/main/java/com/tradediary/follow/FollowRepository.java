// [파일 용도] 팔로우 데이터 JPA Repository

package com.tradediary.follow;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

// [인터페이스] 팔로우 테이블 CRUD Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {

    // [용도] 특정 사용자가 특정 트레이더를 팔로우하고 있는지 확인 / [호출] FollowService.isFollowing()
    Optional<Follow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);

    // [용도] 특정 사용자의 팔로잉 목록 조회 (내가 팔로우하는 사람들) / [호출] FollowService.getFollowings()
    List<Follow> findByFollowerIdOrderByCreatedAtDesc(Long followerId);

    // [용도] 특정 트레이더의 팔로워 목록 조회 (나를 팔로우하는 사람들) / [호출] FollowService.getFollowers()
    List<Follow> findByFollowingIdOrderByCreatedAtDesc(Long followingId);

    // [용도] 팔로우 수 조회 / [호출] FollowService.getFollowingCount()
    long countByFollowerId(Long followerId);

    // [용도] 팔로워 수 조회 / [호출] FollowService.getFollowerCount()
    long countByFollowingId(Long followingId);

    // [용도] 팔로우 삭제 / [호출] FollowService.unfollow()
    void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);

    // [용도] 특정 트레이더의 모든 팔로우 관계 조회 / [호출] TradeService.notifyFollowersAboutTrades()
    @Query("SELECT f FROM Follow f JOIN FETCH f.follower WHERE f.following.id = :followingId")
    List<Follow> findAllByFollowingIdWithFollower(@Param("followingId") Long followingId);

    @Query("SELECT f FROM Follow f JOIN FETCH f.follower WHERE f.following.id = :followingId AND f.tradeAlertsEnabled = true")
    List<Follow> findTradeAlertSubscribers(@Param("followingId") Long followingId);
}
