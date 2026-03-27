// [파일 용도] DB에서 번역된 뉴스 기사 조회 서비스

package com.tradediary.news;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// [클래스] 번역된 뉴스 기사 조회 서비스 (DB 기반)
@Service
@RequiredArgsConstructor
public class NewsService {

    private final NewsArticleRepository newsArticleRepository;

    private static final Map<String, String> CATEGORY_MAP = Map.of(
        "bitcoin",    "BTC",
        "ethereum",   "ETH",
        "altcoin",    "Altcoin",
        "market",     "Market",
        "mining",     "Mining",
        "trading",    "Trading",
        "regulation", "Regulation"
    );

    // [용도] 번역된 뉴스 목록 조회 / [호출] NewsController.getNews()
    public List<NewsArticleDto> getNews(String category, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        List<NewsArticle> articles;

        if (category == null || category.equals("all")) {
            articles = newsArticleRepository.findAllByOrderByPublishedAtDesc(pageable);
        } else {
            String cats = CATEGORY_MAP.getOrDefault(category, category);
            articles = newsArticleRepository
                    .findByCategoriesContainingIgnoreCaseOrderByPublishedAtDesc(cats, pageable);
        }

        return articles.stream().map(NewsArticleDto::from).collect(Collectors.toList());
    }

    // [용도] 뉴스 응답 DTO / [호출] getNews()
    public record NewsArticleDto(
            Long id,
            String titleKo,
            String summaryKo,
            String source,
            String originalUrl,
            String categories,
            String publishedAt
    ) {
        static NewsArticleDto from(NewsArticle a) {
            return new NewsArticleDto(
                    a.getId(),
                    a.getTitleKo(),
                    a.getSummaryKo(),
                    a.getSource(),
                    a.getOriginalUrl(),
                    a.getCategories(),
                    a.getPublishedAt().toString()
            );
        }
    }
}
