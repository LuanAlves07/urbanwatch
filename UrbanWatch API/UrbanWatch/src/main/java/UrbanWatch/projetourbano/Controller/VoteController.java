package  UrbanWatch.projetourbano.Controller;
import UrbanWatch.projetourbano.entity.Vote;
import  UrbanWatch.projetourbano.repository.VoteRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/votes")
public class VoteController {

    private final VoteRepository voteRepository;

    public VoteController(VoteRepository voteRepository) {
        this.voteRepository = voteRepository;
    }

    @PostMapping
    public Vote createVote(@RequestBody Vote vote) {
        return voteRepository.save(vote);
    }

    @GetMapping
    public List<Vote> listVotes() {
        return voteRepository.findAll();
    }
}