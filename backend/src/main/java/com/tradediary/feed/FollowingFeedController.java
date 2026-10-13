package com.tradediary.feed;
import lombok.RequiredArgsConstructor; import org.springframework.http.ResponseEntity; import org.springframework.security.core.annotation.AuthenticationPrincipal; import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/api/feed") @RequiredArgsConstructor public class FollowingFeedController {
 private final FollowingFeedService service;
 @GetMapping("/following") public ResponseEntity<List<FollowingFeedService.FeedItem>> get(@AuthenticationPrincipal Long userId,@RequestParam(defaultValue="30") int limit){return ResponseEntity.ok(service.get(userId,limit));}
}
