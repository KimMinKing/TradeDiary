package com.tradediary.community;

import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_comments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityComment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(nullable = false, length = 2000)
    private String content;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public CommunityComment(CommunityPost post, User user, String content) {
        this.post = post;
        this.user = user;
        this.content = content.trim();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }
}
