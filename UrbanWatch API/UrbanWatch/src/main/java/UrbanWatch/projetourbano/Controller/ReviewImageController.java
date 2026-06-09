package  UrbanWatch.projetourbano.Controller;
import  UrbanWatch.projetourbano.entity.ReviewImage;
import  UrbanWatch.projetourbano.repository.ReviewImageRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/review-images")
public class ReviewImageController {

    private final ReviewImageRepository reviewImageRepository;

    public ReviewImageController(ReviewImageRepository reviewImageRepository) {
        this.reviewImageRepository = reviewImageRepository;
    }

    @PostMapping
    public ReviewImage createReviewImage(@RequestBody ReviewImage reviewImage) {
        return reviewImageRepository.save(reviewImage);
    }

    @GetMapping
    public List<ReviewImage> listReviewImages() {
        return reviewImageRepository.findAll();
    }
}