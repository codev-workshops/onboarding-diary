package com.onboardingdiary.service;

import com.onboardingdiary.dto.ShareRequest;
import com.onboardingdiary.dto.ShareResponse;
import com.onboardingdiary.model.*;
import com.onboardingdiary.repository.DiaryEntryRepository;
import com.onboardingdiary.repository.ShareHistoryRepository;
import com.onboardingdiary.repository.SocialConnectionRepository;
import com.onboardingdiary.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ShareService {

    private final DiaryEntryRepository entryRepository;
    private final UserRepository userRepository;
    private final SocialConnectionRepository socialConnectionRepository;
    private final ShareHistoryRepository shareHistoryRepository;
    private final SocialMediaClient socialMediaClient;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public ShareService(DiaryEntryRepository entryRepository,
                        UserRepository userRepository,
                        SocialConnectionRepository socialConnectionRepository,
                        ShareHistoryRepository shareHistoryRepository,
                        SocialMediaClient socialMediaClient) {
        this.entryRepository = entryRepository;
        this.userRepository = userRepository;
        this.socialConnectionRepository = socialConnectionRepository;
        this.shareHistoryRepository = shareHistoryRepository;
        this.socialMediaClient = socialMediaClient;
    }

    public ShareResponse shareEntry(Long entryId, String username, ShareRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        DiaryEntry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found"));

        if (!entry.getUser().getId().equals(user.getId())) {
            throw new SecurityException("You can only share your own entries");
        }

        SocialPlatform platform = SocialPlatform.fromValue(request.platform());

        SocialConnection connection = socialConnectionRepository
                .findByUserIdAndPlatform(user.getId(), platform)
                .orElseThrow(() -> new IllegalStateException(
                        "No " + platform.getValue() + " account connected. Please connect your account first."));

        String shareMessage = request.message() != null && !request.message().isBlank()
                ? request.message()
                : generateDefaultMessage(entry);

        String postUrl = socialMediaClient.post(platform, connection.getAccessToken(), shareMessage);

        ShareHistory history = new ShareHistory();
        history.setEntry(entry);
        history.setUser(user);
        history.setPlatform(platform);
        history.setPostUrl(postUrl);
        shareHistoryRepository.save(history);

        return new ShareResponse(
                history.getId(),
                entryId,
                platform.getValue(),
                history.getSharedAt(),
                postUrl,
                shareMessage
        );
    }

    private String generateDefaultMessage(DiaryEntry entry) {
        String excerpt = entry.getContent().length() > 200
                ? entry.getContent().substring(0, 200) + "..."
                : entry.getContent();
        String entryUrl = entry.isPublic()
                ? frontendUrl + "/entries/" + entry.getId()
                : "";
        StringBuilder sb = new StringBuilder();
        sb.append(entry.getTitle()).append("\n\n");
        sb.append(excerpt);
        if (!entryUrl.isEmpty()) {
            sb.append("\n\n").append(entryUrl);
        }
        return sb.toString();
    }
}
