package com.urbanwatch.service;

import com.urbanwatch.dto.VoteResponse;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.User;
import com.urbanwatch.entity.Vote;
import com.urbanwatch.exception.CallNotFoundException;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.UserRepository;
import com.urbanwatch.repository.VoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class VoteService {

    private final VoteRepository voteRepository;
    private final CallRepository callRepository;
    private final UserRepository userRepository;

    public VoteService(VoteRepository voteRepository,
                       CallRepository callRepository,
                       UserRepository userRepository) {
        this.voteRepository = voteRepository;
        this.callRepository = callRepository;
        this.userRepository = userRepository;
    }

    /** Registra ou atualiza o voto do usuario (1 voto por usuario/chamado). */
    @Transactional
    public VoteResponse registrar(Long callId, Boolean value, String userEmail) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new CallNotFoundException(callId));
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + userEmail));

        Vote vote = voteRepository.findByCallIdAndUserId(callId, user.getId())
                .orElseGet(() -> {
                    Vote novo = new Vote();
                    novo.setCall(call);
                    novo.setUser(user);
                    return novo;
                });
        vote.setValue(value);
        voteRepository.save(vote);

        return resumo(callId, value);
    }

    /** Remove o voto do usuario, se existir. */
    @Transactional
    public VoteResponse remover(Long callId, String userEmail) {
        if (!callRepository.existsById(callId)) {
            throw new CallNotFoundException(callId);
        }
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + userEmail));
        voteRepository.findByCallIdAndUserId(callId, user.getId())
                .ifPresent(voteRepository::delete);
        return resumo(callId, null);
    }

    /** Resumo de votos; inclui o voto do proprio usuario quando autenticado. */
    public VoteResponse buscar(Long callId, String userEmail) {
        if (!callRepository.existsById(callId)) {
            throw new CallNotFoundException(callId);
        }
        Boolean userVote = null;
        if (userEmail != null) {
            userVote = userRepository.findByEmail(userEmail)
                    .flatMap(user -> voteRepository.findByCallIdAndUserId(callId, user.getId()))
                    .map(Vote::getValue)
                    .orElse(null);
        }
        return resumo(callId, userVote);
    }

    private VoteResponse resumo(Long callId, Boolean userVote) {
        long likes = voteRepository.countByCallIdAndValue(callId, true);
        long dislikes = voteRepository.countByCallIdAndValue(callId, false);
        return new VoteResponse(likes, dislikes, userVote);
    }
}
