package com.tradediary.ranking;
import java.util.List;
public record RankingResponse(String yearMonth,String category,List<RankEntry> entries,MyRank myRank){
 public record RankEntry(int rank,Long userId,String nickname,String avatar,int tradeCount,double winRate,String totalPnl,String totalAssets,double returnPct,double maxDrawdownPct,double consistencyPct,double score,boolean isMe,boolean diaryPublic){}
 public record MyRank(Integer rank,int tradeCount,double winRate,String totalPnl,String totalAssets,double returnPct,double maxDrawdownPct,double consistencyPct,double score,String notice){}
}
