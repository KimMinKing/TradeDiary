package com.tradediary.community;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CommunityCommentRepository extends JpaRepository<CommunityComment, Long> {
    @EntityGraph(attributePaths = "user")
    List<CommunityComment> findByPostIdOrderByCreatedAtAscIdAsc(Long postId);

    @EntityGraph(attributePaths = {"user", "post"})
    @Query("select c from CommunityComment c where c.id = :id")
    Optional<CommunityComment> findWithUserAndPostById(Long id);
}
