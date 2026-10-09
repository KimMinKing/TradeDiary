// [파일 용도] 팔로우 REST API 엔드포인트

package com.tradediary.follow;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// [클래스] 팔로우 관리 API / [엔드포인트] /api/follows
@RestController
@RequestMapping("/api/follows")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    // [용도] 팔로우 추가 / [호출] POST /api/follows/{followingId}
    @PostMapping("/{followingId}")
    public ResponseEntity<FollowResponse> follow(
            @AuthenticationPrincipal Long followerId,
            @PathVariable Long followingId) {
        Follow follow = followService.follow(followerId, followingId);
        return ResponseEntity.ok(FollowResponse.from(follow));
    }

    // [용도] 팔로우 취소 / [호출] DELETE /api/follows/{followingId}
    @DeleteMapping("/{followingId}")
    public ResponseEntity<Void> unfollow(
            @AuthenticationPrincipal Long followerId,
            @PathVariable Long followingId) {
        followService.unfollow(followerId, followingId);
        return ResponseEntity.noContent().build();
    }

    // [용도] 팔로우 여부 확인 / [호출] GET /api/follows/{followingId}/status
    @GetMapping("/{followingId}/status")
    public ResponseEntity<FollowStatusResponse> isFollowing(
            @AuthenticationPrincipal Long followerId,
            @PathVariable Long followingId) {
        var follow = followService.getFollow(followerId, followingId);
        return ResponseEntity.ok(new FollowStatusResponse(follow.isPresent(), follow.map(Follow::isTradeAlertsEnabled).orElse(false)));
    }

    @PutMapping("/{followingId}/trade-alerts")
    public ResponseEntity<FollowStatusResponse> updateTradeAlerts(
            @AuthenticationPrincipal Long followerId, @PathVariable Long followingId,
            @RequestBody TradeAlertRequest request) {
        Follow follow = followService.updateTradeAlerts(followerId, followingId, request.enabled());
        return ResponseEntity.ok(new FollowStatusResponse(true, follow.isTradeAlertsEnabled()));
    }

    // [용도] 내 팔로잉 목록 조회 / [호출] GET /api/follows/following
    @GetMapping("/following")
    public ResponseEntity<List<FollowResponse>> getMyFollowings(
            @AuthenticationPrincipal Long followerId) {
        List<Follow> followings = followService.getMyFollowings(followerId);
        return ResponseEntity.ok(followings.stream().map(FollowResponse::from).toList());
    }

    // [용도] 특정 트레이더의 팔로워 목록 조회 / [호출] GET /api/follows/followers/{userId}
    @GetMapping("/followers/{userId}")
    public ResponseEntity<List<FollowResponse>> getFollowers(@PathVariable Long userId) {
        List<Follow> followers = followService.getFollowers(userId);
        return ResponseEntity.ok(followers.stream().map(FollowResponse::from).toList());
    }

    // [용도] 팔로잉/팔로워 수 조회 / [호출] GET /api/follows/{userId}/count
    @GetMapping("/{userId}/count")
    public ResponseEntity<FollowCountResponse> getCount(@PathVariable Long userId) {
        long followingCount = followService.getFollowingCount(userId);
        long followerCount = followService.getFollowerCount(userId);
        return ResponseEntity.ok(new FollowCountResponse(followingCount, followerCount));
    }

    // [DTO] 팔로우 응답
    public record FollowResponse(
            @JsonProperty("id") Long id,
            @JsonProperty("follower_id") Long followerId,
            @JsonProperty("follower_nickname") String followerNickname,
            @JsonProperty("following_id") Long followingId,
            @JsonProperty("following_nickname") String followingNickname,
            @JsonProperty("created_at") String createdAt,
            @JsonProperty("trade_alerts_enabled") boolean tradeAlertsEnabled
    ) {
        public static FollowResponse from(Follow follow) {
            return new FollowResponse(
                    follow.getId(),
                    follow.getFollower().getId(),
                    follow.getFollower().getNickname(),
                    follow.getFollowing().getId(),
                    follow.getFollowing().getNickname(),
                    follow.getCreatedAt().toString(), follow.isTradeAlertsEnabled()
            );
        }
    }

    // [DTO] 팔로우 상태 응답
    public record FollowStatusResponse(
            @JsonProperty("is_following") boolean isFollowing,
            @JsonProperty("trade_alerts_enabled") boolean tradeAlertsEnabled
    ) {}

    public record TradeAlertRequest(boolean enabled) {}

    // [DTO] 팔로우 카운트 응답
    public record FollowCountResponse(
            @JsonProperty("following_count") long followingCount,
            @JsonProperty("follower_count") long followerCount
    ) {}
}
