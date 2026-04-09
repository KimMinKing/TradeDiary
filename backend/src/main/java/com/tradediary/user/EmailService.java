// [파일 용도] 이메일 발송 서비스 (비밀번호 재설정 메일)

package com.tradediary.user;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

// [클래스] JavaMailSender를 이용한 HTML 이메일 발송 (메일 빈 없으면 로그만 출력)
@Slf4j
@Service
public class EmailService {

    // 로컬 환경에서 MailSenderAutoConfiguration 제외 시 null이 될 수 있음
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${frontend.url}")
    private String frontendUrl;

    // [용도] 비밀번호 재설정 링크 이메일 발송 (비동기) / [호출] UserService.requestPasswordReset()
    @Async
    public void sendPasswordResetEmail(String toEmail, String token) {
        String resetLink = frontendUrl + "/reset-password?token=" + token;

        if (mailSender == null) {
            // 로컬 환경: 메일 대신 콘솔에 링크 출력
            log.warn("[Email] JavaMailSender 미설정 - 메일 발송 생략");
            log.info("[Email] 비밀번호 재설정 링크 (로컬 테스트용): {}", resetLink);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("[TradeDiary] 비밀번호 재설정 안내");
            helper.setText(buildHtmlBody(resetLink), true);

            mailSender.send(message);
            log.info("[Email] 비밀번호 재설정 메일 발송 완료: {}", toEmail);
        } catch (Exception e) {
            log.error("[Email] 메일 발송 실패 to={}: {}", toEmail, e.getMessage());
        }
    }

    // [용도] 비밀번호 재설정 이메일 HTML 본문 생성 / [호출] sendPasswordResetEmail()
    private String buildHtmlBody(String resetLink) {
        return """
                <!DOCTYPE html>
                <html lang="ko">
                <body style="margin:0;padding:0;background:#0d0f14;font-family:'Helvetica Neue',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0d0f14;padding:40px 0;">
                    <tr>
                      <td align="center">
                        <table width="480" cellpadding="0" cellspacing="0"
                               style="background:#161b27;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
                          <!-- 헤더 -->
                          <tr>
                            <td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                              <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
                                TradeDiary
                              </div>
                            </td>
                          </tr>
                          <!-- 본문 -->
                          <tr>
                            <td style="padding:32px;">
                              <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">
                                비밀번호를 재설정하세요
                              </h2>
                              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                                비밀번호 재설정 요청이 접수되었습니다.<br>
                                아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
                              </p>
                              <a href="%s"
                                 style="display:inline-block;padding:14px 28px;background:#7c3aed;
                                        color:#fff;text-decoration:none;border-radius:8px;
                                        font-size:15px;font-weight:600;letter-spacing:0.2px;">
                                비밀번호 재설정
                              </a>
                              <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">
                                이 링크는 <strong style="color:#94a3b8;">30분</strong> 후 만료됩니다.<br>
                                본인이 요청하지 않았다면 이 이메일을 무시하세요.
                              </p>
                            </td>
                          </tr>
                          <!-- 푸터 -->
                          <tr>
                            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
                              <p style="margin:0;font-size:12px;color:#475569;">
                                TradeDiary · 코인 트레이더 성장 분석 플랫폼
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(resetLink);
    }
}
