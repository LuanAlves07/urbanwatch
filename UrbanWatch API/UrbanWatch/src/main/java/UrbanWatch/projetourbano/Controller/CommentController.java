package  UrbanWatch.projetourbano.Controller;
import  UrbanWatch.projetourbano.entity.Comment;
import  UrbanWatch.projetourbano.repository.CommentRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/comments")
public class CommentController {

    private final CommentRepository commentRepository;

    public CommentController(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    @PostMapping
    public Comment createComment(@RequestBody Comment comment) {
        return commentRepository.save(comment);
    }

    @GetMapping
    public List<Comment> listComments() {
        return commentRepository.findAll();
    }
}