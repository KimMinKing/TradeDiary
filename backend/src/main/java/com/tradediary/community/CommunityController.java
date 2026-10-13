package com.tradediary.community;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityService service;

    @GetMapping("/posts")
    public Page<CommunityService.PostSummary> posts(@AuthenticationPrincipal Long userId,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        return service.posts(userId, PageRequest.of(Math.max(page, 0), safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }

    @GetMapping("/posts/{postId}")
    public CommunityService.PostDetail post(@AuthenticationPrincipal Long userId, @PathVariable Long postId) {
        return service.post(userId, postId);
    }

    @PostMapping("/posts") @ResponseStatus(HttpStatus.CREATED)
    public CommunityService.PostDetail create(@AuthenticationPrincipal Long userId, @Valid @RequestBody PostBody body) {
        return service.create(userId, new CommunityService.PostRequest(body.title(), body.content(), body.image(), body.images()));
    }

    @PutMapping("/posts/{postId}")
    public CommunityService.PostDetail update(@AuthenticationPrincipal Long userId, @PathVariable Long postId,
                                               @Valid @RequestBody PostBody body) {
        return service.update(userId, postId, new CommunityService.PostRequest(body.title(), body.content(), body.image(), body.images()));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deletePost(@AuthenticationPrincipal Long userId, @PathVariable Long postId) {
        service.deletePost(userId, postId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posts/{postId}/comments") @ResponseStatus(HttpStatus.CREATED)
    public CommunityService.CommentResponse comment(@AuthenticationPrincipal Long userId, @PathVariable Long postId,
                                                      @Valid @RequestBody CommentBody body) {
        return service.comment(userId, postId, new CommunityService.CommentRequest(body.content()));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@AuthenticationPrincipal Long userId, @PathVariable Long commentId) {
        service.deleteComment(userId, commentId);
        return ResponseEntity.noContent().build();
    }

    public record PostBody(@NotBlank @Size(max = 160) String title,
                           @NotBlank @Size(max = 10000) String content,
                           @Size(max = 2200000) String image,
                           @Size(max = 4) java.util.List<@Size(max = 2200000) String> images) {}
    public record CommentBody(@NotBlank @Size(max = 2000) String content) {}
}
