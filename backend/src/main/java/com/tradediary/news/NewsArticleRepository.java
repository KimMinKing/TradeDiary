// [파일 용도] 뉴스 기사 DB 저장 및 조회 Repository

package com.tradediary.news;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Set;

// [클래스] news_articles 테이블 JPA Repository
public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {

    // [용도] 이미 저장된 외부 ID 목록 조회 (중복 저장 방지) / [호출] NewsScheduler
    Set<String> findExternalIdByExternalIdIn(List<String> externalIds);

    // [용도] 최신순 뉴스 목록 조회 (페이지네이션) / [호출] NewsService
    List<NewsArticle> findAllByOrderByPublishedAtDesc(Pageable pageable);

    // [용도] 카테고리 포함 뉴스 필터 조회 / [호출] NewsService
    List<NewsArticle> findByCategoriesContainingIgnoreCaseOrderByPublishedAtDesc(String category, Pageable pageable);
}
