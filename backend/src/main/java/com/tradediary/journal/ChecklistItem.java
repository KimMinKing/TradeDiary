// [파일 용도] 체크리스트 항목 JPA 엔티티

package com.tradediary.journal;

import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [클래스] 체크리스트 항목 정의 / [호출] ChecklistService, JournalChecklist
@Entity
@Table(name = "checklist_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 20)
    private String category;  // ENTRY(매수 전), EXIT(매도 전), REVIEW(복기)

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}