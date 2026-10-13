package com.tradediary.community;

import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityPost {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(nullable = false, length = 160)
    private String title;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Column(columnDefinition = "TEXT")
    private String image;
    @Column(name = "inline_images", columnDefinition = "TEXT")
    private String inlineImages;
    @Column(nullable = false)
    private long viewCount;
    @Column(nullable = false)
    private int commentCount;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public CommunityPost(User user, String title, String content, String image, String inlineImages) {
        this.user = user;
        this.title = title.trim();
        this.content = content.trim();
        this.image = image;
        this.inlineImages = inlineImages;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public void update(String title, String content, String image, String inlineImages) {
        this.title = title.trim();
        this.content = content.trim();
        this.image = image;
        this.inlineImages = inlineImages;
        this.updatedAt = LocalDateTime.now();
    }

    public void viewed() { this.viewCount++; }
    public void commentAdded() { this.commentCount++; }
    public void commentRemoved() { if (this.commentCount > 0) this.commentCount--; }
}
