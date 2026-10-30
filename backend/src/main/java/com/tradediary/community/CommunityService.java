package com.tradediary.community;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityService {
    private final CommunityPostRepository postRepository;
    private final CommunityCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public Page<PostSummary> posts(Long userId, Pageable pageable) {
        return postRepository.findAllByOrderByCreatedAtDescIdDesc(pageable).map(post -> PostSummary.from(post, userId));
    }

    @Transactional
    public PostDetail post(Long userId, Long postId) {
        CommunityPost post = findPost(postId);
        post.viewed();
        return detail(post, userId);
    }

    @Transactional
    public PostDetail create(Long userId, PostRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return PostDetail.from(postRepository.save(new CommunityPost(user, request.title(), request.content(),
                validImage(request.image()), writeImages(request.images()))), List.of(), userId, objectMapper);
    }

    @Transactional
    public PostDetail update(Long userId, Long postId, PostRequest request) {
        CommunityPost post = findPost(postId);
        requireOwner(post.getUser().getId(), userId);
        post.update(request.title(), request.content(), validImage(request.image()), writeImages(request.images()));
        return detail(post, userId);
    }

    @Transactional
    public void deletePost(Long userId, Long postId) {
        CommunityPost post = findPost(postId);
        requireOwner(post.getUser().getId(), userId);
        postRepository.delete(post);
    }

    @Transactional
    public CommentResponse comment(Long userId, Long postId, CommentRequest request) {
        CommunityPost post = findPost(postId);
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        CommunityComment saved = commentRepository.save(new CommunityComment(post, user, request.content()));
        post.commentAdded();
        return CommentResponse.from(saved, userId);
    }

    @Transactional
    public void deleteComment(Long userId, Long commentId) {
        CommunityComment comment = commentRepository.findWithUserAndPostById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMUNITY_COMMENT_NOT_FOUND));
        requireOwner(comment.getUser().getId(), userId);
        comment.getPost().commentRemoved();
        commentRepository.delete(comment);
    }

    private PostDetail detail(CommunityPost post, Long userId) {
        List<CommentResponse> comments = commentRepository.findByPostIdOrderByCreatedAtAscIdAsc(post.getId())
                .stream().map(comment -> CommentResponse.from(comment, userId)).toList();
        return PostDetail.from(post, comments, userId, objectMapper);
    }

    private CommunityPost findPost(Long id) {
        return postRepository.findWithUserById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMUNITY_POST_NOT_FOUND));
    }

    private void requireOwner(Long ownerId, Long userId) {
        if (!ownerId.equals(userId)) throw new BusinessException(ErrorCode.FORBIDDEN);
    }

    private String validImage(String image) {
        if (image == null || image.isBlank()) return null;
        if (image.length() > 2_200_000 || !image.matches("^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=\\r\\n]+$"))
            throw new BusinessException(ErrorCode.INVALID_COMMUNITY_IMAGE);
        return image;
    }

    private String writeImages(List<String> images) {
        if (images == null || images.isEmpty()) return null;
        if (images.size() > 4) throw new BusinessException(ErrorCode.INVALID_COMMUNITY_IMAGE);
        List<String> valid = images.stream().map(this::validImage).toList();
        try { return objectMapper.writeValueAsString(valid); }
        catch (Exception exception) { throw new BusinessException(ErrorCode.INVALID_COMMUNITY_IMAGE); }
    }

    private static List<String> readImages(String json, ObjectMapper mapper) {
        if (json == null || json.isBlank()) return List.of();
        try { return mapper.readValue(json, new TypeReference<List<String>>() {}); }
        catch (Exception ignored) { return List.of(); }
    }

    public record PostRequest(String title, String content, String image, List<String> images) {}
    public record CommentRequest(String content) {}
    public record Author(Long id, String nickname, String avatar) {
        static Author from(User user) { return new Author(user.getId(), user.getNickname(), user.getAvatar()); }
    }
    public record PostSummary(Long id, String title, Author author, long viewCount, int commentCount,
                              LocalDateTime createdAt, boolean owner) {
        static PostSummary from(CommunityPost post, Long userId) {
            return new PostSummary(post.getId(), post.getTitle(), Author.from(post.getUser()), post.getViewCount(),
                    post.getCommentCount(), post.getCreatedAt(), post.getUser().getId().equals(userId));
        }
    }
    public record CommentResponse(Long id, String content, Author author, LocalDateTime createdAt, boolean owner) {
        static CommentResponse from(CommunityComment comment, Long userId) {
            return new CommentResponse(comment.getId(), comment.getContent(), Author.from(comment.getUser()),
                    comment.getCreatedAt(), comment.getUser().getId().equals(userId));
        }
    }
    public record PostDetail(Long id, String title, String content, String image, List<String> images, Author author, long viewCount, int commentCount,
                             LocalDateTime createdAt, LocalDateTime updatedAt, boolean owner, List<CommentResponse> comments) {
        static PostDetail from(CommunityPost post, List<CommentResponse> comments, Long userId, ObjectMapper mapper) {
            return new PostDetail(post.getId(), post.getTitle(), post.getContent(), post.getImage(), readImages(post.getInlineImages(), mapper), Author.from(post.getUser()),
                    post.getViewCount(), post.getCommentCount(), post.getCreatedAt(), post.getUpdatedAt(),
                    post.getUser().getId().equals(userId), comments);
        }
    }
}
