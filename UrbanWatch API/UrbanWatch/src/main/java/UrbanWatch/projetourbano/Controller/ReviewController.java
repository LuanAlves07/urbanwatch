package  UrbanWatch.projetourbano.Controller;
import UrbanWatch.projetourbano.entity.Review;
import UrbanWatch.projetourbano.repository.ReviewRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reviews")
public class ReviewController {

    private final ReviewRepository reviewRepository;

    public ReviewController(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    @PostMapping
    public Review createReview(@RequestBody Review review) {
        return reviewRepository.save(review);
    }

    @GetMapping
    public List<Review> listReviews() {
        return reviewRepository.findAll();
    }
}