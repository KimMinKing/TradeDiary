package com.tradediary.feed;

import com.tradediary.common.service.PnlCalculationService;
import com.tradediary.follow.FollowRepository;
import com.tradediary.journal.TradeJournalRepository; import com.tradediary.journal.TradeJournal;
import com.tradediary.position.PositionRepository;
import com.tradediary.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.RoundingMode; import java.time.LocalDateTime; import java.util.*;

@Service @RequiredArgsConstructor
public class FollowingFeedService {
 private final FollowRepository followRepository; private final PositionRepository positionRepository; private final TradeJournalRepository journalRepository; private final PnlCalculationService pnlCalculationService;
 @Transactional(readOnly=true) public List<FeedItem> get(Long viewerId,int requestedLimit){
  int limit=Math.max(1,Math.min(50,requestedLimit)); List<User> followed=followRepository.findByFollowerIdOrderByCreatedAtDesc(viewerId).stream().map(f->f.getFollowing()).filter(u->Boolean.TRUE.equals(u.getProfilePublic())).toList(); if(followed.isEmpty())return List.of();
  Map<Long,User> users=new HashMap<>();followed.forEach(u->users.put(u.getId(),u));List<Long> ids=new ArrayList<>(users.keySet());List<FeedItem> items=new ArrayList<>();
  positionRepository.findFeedPositions(ids).stream().filter(p->{User u=users.get(p.getUser().getId());return Boolean.TRUE.equals(u.getStatsPublic())&&Boolean.TRUE.equals(u.getPositionsPublic());}).limit(limit*2L).forEach(p->{User u=users.get(p.getUser().getId());items.add(new FeedItem("POSITION_CLOSED",u.getId(),u.getNickname(),u.getAvatar(),p.getClosedAt(),null,p.getSymbol(),p.getSide().name(),p.getPnlRate().setScale(2,RoundingMode.HALF_UP).toPlainString(),pnlCalculationService.formatKrw(pnlCalculationService.toKrw(p))));});
  journalRepository.findPublicFeedJournals(ids, TradeJournal.Visibility.PUBLIC).stream().filter(j->Boolean.TRUE.equals(users.get(j.getUser().getId()).getDiaryPublic())).limit(limit*2L).forEach(j->{User u=users.get(j.getUser().getId());items.add(new FeedItem("JOURNAL_PUBLISHED",u.getId(),u.getNickname(),u.getAvatar(),j.getCreatedAt(),j.getId(),j.getSymbol(),null,null,null));});
  return items.stream().sorted(Comparator.comparing(FeedItem::occurredAt).reversed()).limit(limit).toList();
 }
 public record FeedItem(String type,Long userId,String nickname,String avatar,LocalDateTime occurredAt,Long journalId,String symbol,String side,String pnlRate,String realizedPnl){}
}
