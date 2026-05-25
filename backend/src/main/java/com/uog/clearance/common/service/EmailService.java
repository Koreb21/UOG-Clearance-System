package com.uog.clearance.common.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@universityofgondar.edu.et}")
    private String fromEmail;

    public void sendVerificationCode(String toEmail, String verificationCode) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Password Reset Verification Code - University of Gondar Clearance System");

            String htmlContent = buildVerificationCodeEmailHtml(verificationCode);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Verification code sent successfully to: {}", toEmail);
        } catch (MessagingException e) {
            log.error("Failed to send verification code email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send verification code email", e);
        }
    }

    public void sendPasswordResetSuccess(String toEmail, String userName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Password Reset Successful - University of Gondar Clearance System");
            message.setText(buildPasswordResetSuccessEmail(userName));

            mailSender.send(message);
            log.info("Password reset success notification sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset success email to: {}", toEmail, e);
            // Don't throw - this is just a notification
        }
    }

    private String buildVerificationCodeEmailHtml(String verificationCode) {
        String htmlBody = """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0f766e 0%, #0d5b55 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .code-box { background: white; border: 2px solid #0f766e; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                    .code { font-size: 36px; font-weight: bold; color: #0f766e; letter-spacing: 5px; }
                    .warning { color: #dc2626; font-size: 14px; margin: 15px 0; }
                    .footer { font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Password Reset Request</h2>
                        <p>University of Gondar Student Clearance System</p>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>We received a request to reset your password. Use the verification code below to proceed:</p>
                        <div class="code-box">
                            <div class="code">%s</div>
                        </div>
                        <p><strong>How to use this code:</strong></p>
                        <ol>
                            <li>Go back to the password reset page</li>
                            <li>Enter your email address</li>
                            <li>Enter the verification code above</li>
                            <li>Create your new password</li>
                        </ol>
                        <div class="warning">
                            ⚠️ <strong>Important:</strong> This code will expire in 10 minutes. If you didn't request this reset, please ignore this email and your password will remain unchanged.
                        </div>
                        <p>If you have any questions, contact the IT support team.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                        <p>&copy; 2026 University of Gondar. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """;
        return String.format(htmlBody, verificationCode);
    }

    private String buildPasswordResetSuccessEmail(String userName) {
        return """
            Hello %s,
            
            Your password has been successfully reset. You can now log in with your new password.
            
            If you did not make this change, please contact IT support immediately.
            
            Best regards,
            University of Gondar Clearance System
            """.formatted(userName);
    }
}
